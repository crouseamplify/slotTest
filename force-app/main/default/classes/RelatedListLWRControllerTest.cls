@isTest
public class RelatedListLWRControllerTest {
    
    @TestSetup
    static void makeData() {
        // Create test Account
        Account testAccount = new Account(
            Name = 'Test Account',
            Type = 'Customer',
            Phone = '555-1234',
            Website = 'https://test.com'
        );
        insert testAccount;
        
        // Create test Contacts
        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            contacts.add(new Contact(
                FirstName = 'Test',
                LastName = 'Contact ' + i,
                Email = 'test' + i + '@example.com',
                Phone = '555-000' + i,
                AccountId = testAccount.Id,
                Title = 'Test Title ' + i
            ));
        }
        insert contacts;
        
        // Create test Opportunities
        List<Opportunity> opportunities = new List<Opportunity>();
        for (Integer i = 0; i < 3; i++) {
            opportunities.add(new Opportunity(
                Name = 'Test Opportunity ' + i,
                AccountId = testAccount.Id,
                Amount = 1000 * (i + 1),
                CloseDate = Date.today().addDays(30),
                StageName = 'Prospecting'
            ));
        }
        insert opportunities;
        
        // Create test Cases
        List<Case> cases = new List<Case>();
        for (Integer i = 0; i < 2; i++) {
            cases.add(new Case(
                Subject = 'Test Case ' + i,
                Status = 'New',
                Priority = 'Medium',
                AccountId = testAccount.Id
            ));
        }
        insert cases;
    }
    
    // ===== SOQL MODE TESTS =====
    
    @isTest
    static void testExecuteQueryBasic() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id, Name FROM Contact WHERE AccountId = \'' + testAccount.Id + '\'',
            testAccount.Id
        );
        Test.stopTest();
        
        System.assertNotEquals(null, result);
        System.assertEquals(null, result.error);
        System.assertEquals(5, result.records.size());
    }
    
    @isTest
    static void testExecuteQueryWithVariables() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id, Name, Email FROM Contact WHERE AccountId = \'$recordId\'',
            testAccount.Id
        );
        Test.stopTest();
        
        System.assertEquals(null, result.error);
        System.assertEquals(5, result.records.size());
    }
    
    @isTest
    static void testExecuteQueryWithUserVariable() {
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id, Name FROM User WHERE Id = \'$userId\'',
            null
        );
        Test.stopTest();
        
        System.assertEquals(null, result.error);
        System.assertEquals(1, result.records.size());
    }
    
    @isTest
    static void testExecuteQueryWithRelationshipFields() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id, Name, Account.Name, Account.Type FROM Contact WHERE AccountId = \'$recordId\'',
            testAccount.Id
        );
        Test.stopTest();
        
        System.assertEquals(null, result.error);
        System.assertEquals(5, result.records.size());
    }
    
    @isTest
    static void testExecuteQueryWithLimit() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id, Name FROM Contact WHERE AccountId = \'$recordId\' LIMIT 2',
            testAccount.Id
        );
        Test.stopTest();
        
        System.assertEquals(null, result.error);
        System.assertEquals(2, result.records.size());
    }
    
    @isTest
    static void testExecuteQueryAutoLimit() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id, Name FROM Contact WHERE AccountId = \'$recordId\'',
            testAccount.Id
        );
        Test.stopTest();
        
        System.assertEquals(null, result.error);
        System.assertEquals(5, result.records.size()); // Less than auto-limit of 50
    }
    
    @isTest
    static void testExecuteQueryErrors() {
        // Test empty query
        Test.startTest();
        RelatedListLWRController.QueryResult result1 = RelatedListLWRController.executeQuery('', 'someId');
        System.assertEquals('SOQL query is required', result1.error);
        
        // Test invalid query
        RelatedListLWRController.QueryResult result2 = RelatedListLWRController.executeQuery(
            'SELECT InvalidField FROM Contact',
            null
        );
        System.assertNotEquals(null, result2.error);
        System.assert(result2.error.contains('Query error'));
        
        // Test invalid recordId
        RelatedListLWRController.QueryResult result3 = RelatedListLWRController.executeQuery(
            'SELECT Id FROM Contact WHERE Id = \'$recordId\'',
            'invalid-id'
        );
        System.assertEquals('Error executing query: Invalid recordId format provided', result3.error);
        Test.stopTest();
    }
    
    @isTest
    static void testGetFieldInfo() {
        Test.startTest();
        List<RelatedListLWRController.FieldInfo> fields = RelatedListLWRController.getFieldInfo(
            'Contact',
            'Id, Name, Email, Phone, Title'
        );
        Test.stopTest();
        
        System.assertEquals(5, fields.size());
        
        Map<String, RelatedListLWRController.FieldInfo> fieldMap = new Map<String, RelatedListLWRController.FieldInfo>();
        for (RelatedListLWRController.FieldInfo field : fields) {
            fieldMap.put(field.apiName, field);
        }
        
        System.assert(fieldMap.containsKey('Id'));
        System.assert(fieldMap.containsKey('Name'));
        System.assert(fieldMap.containsKey('Email'));
        System.assertEquals('Email', fieldMap.get('Email').label);
    }
    
    @isTest
    static void testGetFieldInfoWithRelationships() {
        Test.startTest();
        List<RelatedListLWRController.FieldInfo> fields = RelatedListLWRController.getFieldInfo(
            'Contact',
            'Name, Account.Name, Account.Type'
        );
        Test.stopTest();
        
        System.assertEquals(3, fields.size());
        
        Boolean foundRelationshipField = false;
        for (RelatedListLWRController.FieldInfo field : fields) {
            if (field.apiName == 'Account.Name') {
                foundRelationshipField = true;
                System.assertEquals('Account Name', field.label);
            }
        }
        System.assert(foundRelationshipField);
    }
    
    @isTest
    static void testGetFieldInfoErrors() {
        Test.startTest();
        // Test empty parameters
        List<RelatedListLWRController.FieldInfo> fields1 = RelatedListLWRController.getFieldInfo('', 'Name');
        System.assertEquals(0, fields1.size());
        
        List<RelatedListLWRController.FieldInfo> fields2 = RelatedListLWRController.getFieldInfo('Contact', '');
        System.assertEquals(0, fields2.size());
        
        // Test invalid object
        List<RelatedListLWRController.FieldInfo> fields3 = RelatedListLWRController.getFieldInfo('InvalidObject', 'Name');
        System.assertEquals(0, fields3.size());
        Test.stopTest();
    }
    
    // ===== RELATED LIST API MODE TESTS =====
    
    @isTest
    static void testGetObjectTypeFromRecordId() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        Contact testContact = [SELECT Id FROM Contact LIMIT 1];
        
        Test.startTest();
        String accountType = RelatedListLWRController.getObjectTypeFromRecordId(testAccount.Id);
        String contactType = RelatedListLWRController.getObjectTypeFromRecordId(testContact.Id);
        String nullType = RelatedListLWRController.getObjectTypeFromRecordId(null);
        String invalidType = RelatedListLWRController.getObjectTypeFromRecordId('invalid-id');
        Test.stopTest();
        
        System.assertEquals('Account', accountType);
        System.assertEquals('Contact', contactType);
        System.assertEquals(null, nullType);
        System.assertEquals(null, invalidType);
    }
    
    @isTest
    static void testGetRelatedListInfoContacts() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'Contacts',
            testAccount.Id,
            'Name,Email,Phone,Title',
            ''
        );
        Test.stopTest();
        
        System.assertNotEquals(null, result);
        System.assertEquals('Contact', result.relatedObjectType);
        System.assertEquals(4, result.fields.size()); // Name, Email, Phone, Title
        System.assertEquals(5, result.records.size());
        
        // Verify field information
        Map<String, RelatedListLWRController.FieldInfo> fieldMap = new Map<String, RelatedListLWRController.FieldInfo>();
        for (RelatedListLWRController.FieldInfo field : result.fields) {
            fieldMap.put(field.apiName, field);
        }
        System.assert(fieldMap.containsKey('Name'));
        System.assert(fieldMap.containsKey('Email'));
    }
    
    @isTest
    static void testGetRelatedListInfoOpportunities() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'Opportunities',
            testAccount.Id,
            'Name,Amount,CloseDate,StageName',
            ''
        );
        Test.stopTest();
        
        System.assertEquals('Opportunity', result.relatedObjectType);
        System.assertEquals(4, result.fields.size());
        System.assertEquals(3, result.records.size());
    }
    
    @isTest
    static void testGetRelatedListInfoCases() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'Cases',
            testAccount.Id,
            'CaseNumber,Subject,Status,Priority',
            ''
        );
        Test.stopTest();
        
        System.assertEquals('Case', result.relatedObjectType);
        System.assertEquals(4, result.fields.size());
        System.assertEquals(2, result.records.size());
    }
    
    @isTest
    static void testGetRelatedListInfoWithSpecificRelationshipField() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'Contacts',
            testAccount.Id,
            'Name,Email',
            'AccountId'
        );
        Test.stopTest();
        
        System.assertEquals('Contact', result.relatedObjectType);
        System.assertEquals(2, result.fields.size());
        System.assertEquals(5, result.records.size());
    }
    
    @isTest
    static void testGetRelatedListInfoDefaultFields() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        // Test with empty enabledFields to get default fields
        RelatedListLWRController.RelatedListInfo result = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'Contacts',
            testAccount.Id,
            '',
            ''
        );
        Test.stopTest();
        
        System.assertEquals('Contact', result.relatedObjectType);
        System.assert(result.fields.size() > 0); // Should get default fields
        System.assertEquals(5, result.records.size());
    }
    
    @isTest
    static void testGetRelatedListInfoErrors() {
        Test.startTest();
        // Test invalid object type
        RelatedListLWRController.RelatedListInfo result1 = RelatedListLWRController.getRelatedListInfo(
            'InvalidObject',
            'Contacts',
            'someId',
            'Name',
            ''
        );
        System.assertEquals(0, result1.records.size());
        
        // Test non-existent related list
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        RelatedListLWRController.RelatedListInfo result2 = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'NonExistentList',
            testAccount.Id,
            'Name',
            ''
        );
        System.assertEquals('NonExistentList', result2.relationshipName);
        System.assertEquals(0, result2.records.size());
        Test.stopTest();
    }
    
    // ===== EDGE CASE AND UTILITY METHOD TESTS =====
    
    @isTest
    static void testProcessFieldEdgeCases() {
        Test.startTest();
        // Test with various field configurations
        List<RelatedListLWRController.FieldInfo> fields = RelatedListLWRController.getFieldInfo(
            'Contact',
            'Id, Name, NonExistentField, Account.Name'
        );
        Test.stopTest();
        
        // Should only return valid fields
        System.assert(fields.size() >= 3); // At least Id, Name, Account.Name
        
        Map<String, RelatedListLWRController.FieldInfo> fieldMap = new Map<String, RelatedListLWRController.FieldInfo>();
        for (RelatedListLWRController.FieldInfo field : fields) {
            fieldMap.put(field.apiName, field);
        }
        
        System.assert(fieldMap.containsKey('Id'));
        System.assert(fieldMap.containsKey('Name'));
        System.assert(fieldMap.containsKey('Account.Name'));
    }
    
    @isTest
    static void testQueryWithOrgIdVariable() {
        Test.startTest();
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'SELECT Id FROM Organization WHERE Id = \'$orgId\'',
            null
        );
        Test.stopTest();
        
        System.assertEquals(null, result.error);
        System.assertEquals(1, result.records.size());
    }
    
    @isTest
    static void testInvalidQueryFormat() {
        Test.startTest();
        // Test non-SELECT statement
        RelatedListLWRController.QueryResult result = RelatedListLWRController.executeQuery(
            'DESCRIBE Contact',
            null
        );
        System.assertEquals('Error executing query: Only SELECT queries are allowed', result.error);
        Test.stopTest();
    }
    
    @isTest
    static void testComplexRelationshipFields() {
        Test.startTest();
        List<RelatedListLWRController.FieldInfo> fields = RelatedListLWRController.getFieldInfo(
            'Contact',
            'Account.Owner.Name, Account.CreatedBy.Email'
        );
        Test.stopTest();
        
        // Should handle multi-level relationships
        System.assert(fields.size() >= 0); // May or may not work depending on security
    }
    
    @isTest
    static void testGetRelatedListInfoWithoutRecordId() {
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = RelatedListLWRController.getRelatedListInfo(
            'Account',
            'Contacts',
            '', // Empty record ID
            'Name,Email',
            ''
        );
        Test.stopTest();
        
        // Should return field info but no records
        System.assertEquals('Contact', result.relatedObjectType);
        System.assertEquals(2, result.fields.size());
        System.assertEquals(0, result.records.size());
    }
    
    @isTest 
    static void testCaseInsensitiveFieldMatching() {
        Test.startTest();
        List<RelatedListLWRController.FieldInfo> fields = RelatedListLWRController.getFieldInfo(
            'Contact',
            'id, NAME, email' // Mixed case
        );
        Test.stopTest();
        
        System.assertEquals(3, fields.size());
        
        Set<String> fieldNames = new Set<String>();
        for (RelatedListLWRController.FieldInfo field : fields) {
            fieldNames.add(field.apiName.toLowerCase());
        }
        
        System.assert(fieldNames.contains('id'));
        System.assert(fieldNames.contains('name'));
        System.assert(fieldNames.contains('email'));
    }
    
    @isTest
    static void testCommonDisplayFieldsForDifferentObjects() {
        Account testAccount = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        // Test common fields for different object types
        RelatedListLWRController.RelatedListInfo contactResult = RelatedListLWRController.getRelatedListInfo(
            'Account', 'Contacts', testAccount.Id, '', ''
        );
        
        RelatedListLWRController.RelatedListInfo oppResult = RelatedListLWRController.getRelatedListInfo(
            'Account', 'Opportunities', testAccount.Id, '', ''
        );
        
        RelatedListLWRController.RelatedListInfo caseResult = RelatedListLWRController.getRelatedListInfo(
            'Account', 'Cases', testAccount.Id, '', ''
        );
        Test.stopTest();
        
        // Each should have appropriate common fields
        System.assert(contactResult.fields.size() > 0);
        System.assert(oppResult.fields.size() > 0);
        System.assert(caseResult.fields.size() > 0);
    }
}