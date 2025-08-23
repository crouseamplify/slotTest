public with sharing class SlotTestController {
    
    // ===== EXISTING SOQL METHODS =====
    
    @AuraEnabled(cacheable=true)
    public static QueryResult executeQuery(String soqlQuery, String recordId) {
        QueryResult result = new QueryResult();
        result.records = new List<sObject>();
        result.error = null;
        
        try {
            if (String.isBlank(soqlQuery)) {
                result.error = 'SOQL query is required';
                return result;
            }
            
            // Enhanced variable replacement with better security
            String processedQuery = processQueryVariables(soqlQuery, recordId);
            
            // Enhanced query validation
            validateQuery(processedQuery);
            
            // Add automatic LIMIT if not present (prevent runaway queries)
            if (!processedQuery.toUpperCase().contains('LIMIT')) {
                processedQuery += ' LIMIT 50';
            }
            
            System.debug('SlotTest: Executing SOQL: ' + processedQuery);
            Long startTime = System.currentTimeMillis();
            
            result.records = Database.query(processedQuery);
            
            Long endTime = System.currentTimeMillis();
            System.debug('SlotTest: Query returned ' + result.records.size() + ' records in ' + (endTime - startTime) + 'ms');
            
        } catch (QueryException qe) {
            System.debug('SlotTest: Query error: ' + qe.getMessage());
            result.error = 'Query error: ' + qe.getMessage();
        } catch (Exception e) {
            System.debug('SlotTest: Unexpected error: ' + e.getMessage());
            result.error = 'Error executing query: ' + e.getMessage();
        }
        
        return result;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<FieldInfo> getFieldInfo(String objectApiName, String fieldList) {
        List<FieldInfo> fields = new List<FieldInfo>();
        
        try {
            if (String.isBlank(objectApiName) || String.isBlank(fieldList)) {
                System.debug('SlotTest: Missing objectApiName or fieldList');
                return fields;
            }
            
            System.debug('SlotTest: Getting field info for ' + objectApiName + ', fields: ' + fieldList);
            
            Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectApiName);
            if (sObjectType == null) {
                System.debug('SlotTest: Object type not found: ' + objectApiName);
                return fields;
            }
            
            Schema.DescribeSObjectResult describe = sObjectType.getDescribe();
            Map<String, Schema.SObjectField> fieldMap = describe.fields.getMap();
            
            List<String> fieldNames = parseFieldList(fieldList);
            for (String fieldName : fieldNames) {
                if (String.isNotBlank(fieldName)) {
                    FieldInfo fieldInfo = processField(fieldName.trim(), fieldMap);
                    if (fieldInfo != null) {
                        fields.add(fieldInfo);
                        System.debug('SlotTest: Added field: ' + fieldInfo.apiName + ' (' + fieldInfo.label + ')');
                    } else {
                        System.debug('SlotTest: Could not process field: ' + fieldName);
                    }
                }
            }
            
            System.debug('SlotTest: Processed ' + fields.size() + ' fields successfully');
            
        } catch (Exception e) {
            System.debug('SlotTest: Error getting field info: ' + e.getMessage());
        }
        
        return fields;
    }
    
    // ===== NEW ARL (RELATED LIST API) METHODS =====
    
    @AuraEnabled(cacheable=true)
    public static String getObjectTypeFromRecordId(String recordId) {
        try {
            if (String.isBlank(recordId)) {
                return null;
            }
            
            // Get the object type from the record ID
            Id recordIdObj = Id.valueOf(recordId);
            Schema.SObjectType objectType = recordIdObj.getSObjectType();
            String objectApiName = objectType.getDescribe().getName();
            
            System.debug('SlotTest: Detected object type: ' + objectApiName + ' from recordId: ' + recordId);
            return objectApiName;
            
        } catch (Exception e) {
            System.debug('SlotTest: Error getting object type from recordId: ' + e.getMessage());
            return null;
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static RelatedListInfo getRelatedListInfo(String objectApiName, String relatedListName, String recordId, String enabledFields, String relationshipField) {
        try {
            System.debug('SlotTest: Starting getRelatedListInfo with: objectApiName=' + objectApiName + ', relatedListName=' + relatedListName + ', recordId=' + recordId + ', relationshipField=' + relationshipField);
            
            RelatedListInfo result = new RelatedListInfo();
            result.fields = new List<FieldInfo>();
            result.records = new List<sObject>();
            
            // Enhanced relationship finding for custom objects
            RelationshipMapping relationshipInfo = findRelatedListMapping(objectApiName, relatedListName, relationshipField);
            System.debug('SlotTest: Found relationship mapping: ' + relationshipInfo);
            
            if (relationshipInfo == null) {
                System.debug('SlotTest: No relationship mapping found for: ' + relatedListName);
                result.relationshipName = relatedListName;
                return result;
            }
            
            // Set the relationship info
            result.relationshipName = relationshipInfo.relationshipName;
            result.relatedObjectType = relationshipInfo.childObjectType;
            
            System.debug('SlotTest: Using relationship: ' + result.relationshipName + ' -> ' + result.relatedObjectType);
            
            // Get field information
            if (String.isNotBlank(result.relatedObjectType)) {
                result.fields = getRelatedListFields(result.relatedObjectType, enabledFields);
                System.debug('SlotTest: Found ' + result.fields.size() + ' fields');
                
                // Get actual related records if we have a record ID
                if (String.isNotBlank(recordId)) {
                    result.records = getRelatedRecords(objectApiName, relationshipInfo, recordId, result.fields);
                    System.debug('SlotTest: Found ' + result.records.size() + ' records');
                }
            }
            
            System.debug('SlotTest: Final result: fields=' + result.fields.size() + ', records=' + result.records.size());
            return result;
            
        } catch (Exception e) {
            System.debug('SlotTest: Error in getRelatedListInfo: ' + e.getMessage() + '\n' + e.getStackTraceString());
            throw new AuraHandledException('Error retrieving related list info: ' + e.getMessage());
        }
    }
    
    // ===== SHARED UTILITY METHODS =====
    
    // Enhanced query variable processing with better security
    private static String processQueryVariables(String soqlQuery, String recordId) {
        String processedQuery = soqlQuery;
        
        // Replace $recordId with proper escaping
        if (String.isNotBlank(recordId)) {
            // Validate recordId format for security
            if (isValidRecordId(recordId)) {
                processedQuery = processedQuery.replace('$recordId', recordId);
            } else {
                throw new QueryException('Invalid recordId format provided');
            }
        }
        
        // Replace $userId with current user ID
        String currentUserId = UserInfo.getUserId();
        processedQuery = processedQuery.replace('$userId', currentUserId);
        
        // Replace other common variables
        processedQuery = processedQuery.replace('$orgId', UserInfo.getOrganizationId());
        
        return processedQuery;
    }
    
    // Validate recordId format for security
    private static Boolean isValidRecordId(String recordId) {
        try {
            Id testId = Id.valueOf(recordId);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    // Enhanced query validation
    private static void validateQuery(String query) {
        String upperQuery = query.toUpperCase();
        
        // Block potentially dangerous operations
        List<String> blockedOperations = new List<String>{
            'DELETE', 'INSERT', 'UPDATE', 'UPSERT', 'MERGE'
        };
        
        for (String operation : blockedOperations) {
            if (upperQuery.contains(operation)) {
                throw new QueryException('Operation not allowed: ' + operation);
            }
        }
        
        // Ensure it's a SELECT statement
        if (!upperQuery.trim().startsWith('SELECT')) {
            throw new QueryException('Only SELECT queries are allowed');
        }
    }
    
    // Enhanced field list parsing
    private static List<String> parseFieldList(String fieldList) {
        List<String> fieldNames = new List<String>();
        
        if (String.isNotBlank(fieldList)) {
            List<String> rawFields = fieldList.split(',');
            for (String field : rawFields) {
                String trimmedField = field.trim();
                if (String.isNotBlank(trimmedField)) {
                    fieldNames.add(trimmedField);
                }
            }
        }
        
        return fieldNames;
    }
    
    // ===== ARL-SPECIFIC METHODS =====
    
    private static RelationshipMapping findRelatedListMapping(String parentObjectType, String searchName, String relationshipField) {
        System.debug('SlotTest: Finding relationship mapping for: ' + parentObjectType + ' -> ' + searchName + ' with relationshipField: ' + relationshipField);
        
        if (String.isBlank(searchName)) {
            return null;
        }
        
        try {
            Schema.SObjectType parentType = Schema.getGlobalDescribe().get(parentObjectType);
            if (parentType == null) {
                System.debug('SlotTest: Parent object type not found: ' + parentObjectType);
                return null;
            }
            
            Schema.DescribeSObjectResult parentDescribe = parentType.getDescribe();
            List<Schema.ChildRelationship> childRelationships = parentDescribe.getChildRelationships();
            
            System.debug('SlotTest: Found ' + childRelationships.size() + ' child relationships for ' + parentObjectType);
            
            // Priority Strategy: If relationshipField is specified, use it to find the exact relationship
            if (String.isNotBlank(relationshipField)) {
                System.debug('SlotTest: Using specified relationship field: ' + relationshipField);
                for (Schema.ChildRelationship relationship : childRelationships) {
                    String fieldName = relationship.getField().getDescribe().getName();
                    if (fieldName.equalsIgnoreCase(relationshipField)) {
                        System.debug('SlotTest: Found exact match for relationship field: ' + relationshipField + ' -> ' + relationship.getChildSObject().getDescribe().getName());
                        return createRelationshipMapping(relationship);
                    }
                }
                System.debug('SlotTest: Specified relationship field not found: ' + relationshipField);
            }
            
            // Strategy 1: Exact match on relationship name (API name)
            for (Schema.ChildRelationship relationship : childRelationships) {
                if (relationship.getRelationshipName() == searchName) {
                    return createRelationshipMapping(relationship);
                }
            }
            
            // Strategy 2: Case-insensitive match on relationship name
            String searchNameLower = searchName.toLowerCase();
            for (Schema.ChildRelationship relationship : childRelationships) {
                if (relationship.getRelationshipName() != null && 
                    relationship.getRelationshipName().toLowerCase() == searchNameLower) {
                    return createRelationshipMapping(relationship);
                }
            }
            
            // Strategy 3: Match based on child object label/name patterns
            for (Schema.ChildRelationship relationship : childRelationships) {
                String childObjectName = relationship.getChildSObject().getDescribe().getName();
                String childObjectLabel = relationship.getChildSObject().getDescribe().getLabel();
                String childObjectLabelPlural = relationship.getChildSObject().getDescribe().getLabelPlural();
                
                // Check if searchName matches any of the child object identifiers
                if (searchName.equalsIgnoreCase(childObjectLabel) || 
                    searchName.equalsIgnoreCase(childObjectLabelPlural) ||
                    searchName.equalsIgnoreCase(childObjectName)) {
                    System.debug('SlotTest: Found match by object label/name: ' + searchName + ' -> ' + childObjectName);
                    return createRelationshipMapping(relationship);
                }
            }
            
            System.debug('SlotTest: Could not find relationship for: ' + searchName + ' on object: ' + parentObjectType);
            
        } catch (Exception e) {
            System.debug('SlotTest: Error finding related list mapping: ' + e.getMessage());
        }
        
        return null;
    }
    
    private static RelationshipMapping createRelationshipMapping(Schema.ChildRelationship relationship) {
        RelationshipMapping mapping = new RelationshipMapping();
        mapping.relationshipName = relationship.getRelationshipName();
        mapping.childObjectType = relationship.getChildSObject().getDescribe().getName();
        mapping.relationshipField = relationship.getField().getDescribe().getName();
        return mapping;
    }
    
    private static List<sObject> getRelatedRecords(String parentObjectType, RelationshipMapping relationshipInfo, String recordId, List<FieldInfo> fields) {
        List<sObject> records = new List<sObject>();
        
        try {
            if (String.isBlank(recordId) || fields.isEmpty()) {
                System.debug('SlotTest: Missing recordId or fields for query');
                return records;
            }
            
            // Build field list for query, handling both direct and relationship fields
            Set<String> fieldNames = new Set<String>();
            fieldNames.add('Id'); // Always include Id
            
            for (FieldInfo field : fields) {
                fieldNames.add(field.apiName);
            }
            
            // Build the SOQL query using the relationship field
            String soqlQuery = 'SELECT ' + String.join(new List<String>(fieldNames), ', ') + 
                              ' FROM ' + relationshipInfo.childObjectType +
                              ' WHERE ' + relationshipInfo.relationshipField + ' = :recordId';
            
            // Add ORDER BY for consistent results
            if (fieldNames.contains('Name')) {
                soqlQuery += ' ORDER BY Name';
            } else if (fieldNames.contains('CreatedDate')) {
                soqlQuery += ' ORDER BY CreatedDate DESC';
            }
            
            // Add LIMIT to prevent too many records
            soqlQuery += ' LIMIT 50';
            
            System.debug('SlotTest: Executing SOQL with relationship fields: ' + soqlQuery);
            records = Database.query(soqlQuery);
            System.debug('SlotTest: Query returned ' + records.size() + ' records');
            
        } catch (Exception e) {
            System.debug('SlotTest: Error querying related records: ' + e.getMessage() + '\n' + e.getStackTraceString());
        }
        
        return records;
    }
    
    private static List<FieldInfo> getRelatedListFields(String objectType, String enabledFields) {
        List<FieldInfo> fields = new List<FieldInfo>();
        
        try {
            Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectType);
            if (sObjectType == null) {
                System.debug('SlotTest: Could not find object type: ' + objectType);
                return fields;
            }
            
            Schema.DescribeSObjectResult describe = sObjectType.getDescribe();
            Map<String, Schema.SObjectField> fieldMap = describe.fields.getMap();
            
            List<String> fieldsToShow = new List<String>();
            
            // If enabledFields is specified, use those fields
            if (String.isNotBlank(enabledFields)) {
                List<String> enabledList = enabledFields.split(',');
                for (String fieldName : enabledList) {
                    String trimmed = fieldName.trim();
                    if (String.isNotBlank(trimmed)) {
                        fieldsToShow.add(trimmed);
                    }
                }
            } else {
                // Otherwise, use common fields for the object type
                fieldsToShow = getCommonDisplayFields(objectType);
            }
            
            // Process each field
            for (String fieldName : fieldsToShow) {
                FieldInfo fieldInfo = processField(fieldName, fieldMap);
                if (fieldInfo != null) {
                    fields.add(fieldInfo);
                    System.debug('SlotTest: Added field: ' + fieldInfo.apiName + ' (' + fieldInfo.label + ')');
                }
            }
            
        } catch (Exception e) {
            System.debug('SlotTest: Error getting related list fields: ' + e.getMessage());
        }
        
        return fields;
    }
    
    private static List<String> getCommonDisplayFields(String objectType) {
        // Return common fields that are typically displayed in related lists
        Map<String, List<String>> commonFieldsByObject = new Map<String, List<String>>{
            'Contact' => new List<String>{'Name', 'Email', 'Phone', 'Title'},
            'Opportunity' => new List<String>{'Name', 'Amount', 'CloseDate', 'StageName'},
            'Case' => new List<String>{'CaseNumber', 'Subject', 'Status', 'Priority'},
            'Task' => new List<String>{'Subject', 'Status', 'Priority', 'ActivityDate'},
            'Event' => new List<String>{'Subject', 'ActivityDate', 'StartDateTime', 'EndDateTime'},
            'Lead' => new List<String>{'Name', 'Company', 'Email', 'Phone', 'Status'},
            'Account' => new List<String>{'Name', 'Type', 'Phone', 'Website'}
        };
        
        if (commonFieldsByObject.containsKey(objectType)) {
            return commonFieldsByObject.get(objectType);
        }
        
        // Default fields for any object (including custom objects)
        return new List<String>{'Name', 'CreatedDate', 'LastModifiedDate'};
    }
    
    // ===== SOQL-SPECIFIC METHODS =====
    
    private static FieldInfo processField(String fieldName, Map<String, Schema.SObjectField> fieldMap) {
        try {
            // Handle relationship fields (e.g., Account.Name)
            if (fieldName.contains('.')) {
                return processRelationshipField(fieldName, fieldMap);
            } else {
                return processDirectField(fieldName, fieldMap);
            }
        } catch (Exception e) {
            System.debug('SlotTest: Error processing field ' + fieldName + ': ' + e.getMessage());
            return null;
        }
    }
    
    private static FieldInfo processDirectField(String fieldName, Map<String, Schema.SObjectField> fieldMap) {
        Schema.SObjectField field = findField(fieldMap, fieldName);
        if (field != null) {
            Schema.DescribeFieldResult fieldDescribe = field.getDescribe();
            if (fieldDescribe.isAccessible()) {
                FieldInfo fieldInfo = new FieldInfo();
                fieldInfo.apiName = fieldDescribe.getName();
                fieldInfo.label = fieldDescribe.getLabel();
                fieldInfo.type = String.valueOf(fieldDescribe.getType());
                return fieldInfo;
            }
        }
        return null;
    }
    
    private static FieldInfo processRelationshipField(String fieldName, Map<String, Schema.SObjectField> fieldMap) {
        List<String> parts = fieldName.split('\\.');
        if (parts.size() != 2) {
            return null;
        }
        
        String relationshipName = parts[0]; // e.g., "Account"
        String targetFieldName = parts[1];  // e.g., "Name"
        
        // For standard relationships, the field name is typically the relationship name + "Id"
        String lookupFieldName = relationshipName + 'Id'; // e.g., "AccountId"
        
        // If it's a custom relationship, try the __r to __c conversion
        if (relationshipName.endsWith('__r')) {
            lookupFieldName = relationshipName.substring(0, relationshipName.length() - 3) + '__c';
        }
        
        Schema.SObjectField lookupField = findField(fieldMap, lookupFieldName);
        if (lookupField == null) {
            return null;
        }
        
        Schema.DescribeFieldResult lookupFieldDescribe = lookupField.getDescribe();
        if (!lookupFieldDescribe.isAccessible() || lookupFieldDescribe.getType() != Schema.DisplayType.REFERENCE) {
            return null;
        }
        
        // Get the target object type from the lookup field
        List<Schema.sObjectType> referenceTo = lookupFieldDescribe.getReferenceTo();
        if (referenceTo.isEmpty()) {
            return null;
        }
        
        Schema.sObjectType targetObjectType = referenceTo[0];
        Schema.DescribeSObjectResult targetDescribe = targetObjectType.getDescribe();
        Map<String, Schema.SObjectField> targetFieldMap = targetDescribe.fields.getMap();
        
        // Find the target field on the related object
        Schema.SObjectField targetField = findField(targetFieldMap, targetFieldName);
        if (targetField == null) {
            return null;
        }
        
        Schema.DescribeFieldResult targetFieldDescribe = targetField.getDescribe();
        if (!targetFieldDescribe.isAccessible()) {
            return null;
        }
        
        // Create FieldInfo for the relationship field
        FieldInfo fieldInfo = new FieldInfo();
        fieldInfo.apiName = fieldName; // Keep the full relationship notation for SOQL
        fieldInfo.label = targetFieldDescribe.getLabel();
        fieldInfo.type = String.valueOf(targetFieldDescribe.getType());
        
        return fieldInfo;
    }
    
    private static Schema.SObjectField findField(Map<String, Schema.SObjectField> fieldMap, String fieldName) {
        // Try exact match first
        if (fieldMap.containsKey(fieldName)) {
            return fieldMap.get(fieldName);
        }
        
        // Try case-insensitive match
        for (String key : fieldMap.keySet()) {
            if (key.equalsIgnoreCase(fieldName)) {
                return fieldMap.get(key);
            }
        }
        
        return null;
    }
    
    // ===== WRAPPER CLASSES =====
    
    // Enhanced wrapper classes that work for both SOQL and ARL modes
    public class QueryResult {
        @AuraEnabled public List<sObject> records;
        @AuraEnabled public String error;
    }
    
    public class FieldInfo {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String type;
    }
    
    // ARL-specific wrapper classes
    public class RelatedListInfo {
        @AuraEnabled public List<FieldInfo> fields;
        @AuraEnabled public List<sObject> records;
        @AuraEnabled public String relationshipName;
        @AuraEnabled public String relatedObjectType;
    }
    
    // Helper class for relationship mapping
    private class RelationshipMapping {
        public String relationshipName;
        public String childObjectType;
        public String relationshipField;
    }
}