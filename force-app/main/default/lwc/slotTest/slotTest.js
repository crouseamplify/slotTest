import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import executeQuery from '@salesforce/apex/SlotTestController.executeQuery';
import getFieldInfo from '@salesforce/apex/SlotTestController.getFieldInfo';
import getRelatedListInfo from '@salesforce/apex/SlotTestController.getRelatedListInfo';
import getObjectTypeFromRecordId from '@salesforce/apex/SlotTestController.getObjectTypeFromRecordId';

/**
 * @slot slot1
 * @slot slot2
 * @slot slot3
 * @slot slot4
 */
export default class SlotTest extends NavigationMixin(LightningElement) {
    
    // ===== API PROPERTIES =====
    
    // Configuration and context
    @api configJSONString = '{}';
    @api recordId;
    
    // ===== PRIVATE TRACKED PROPERTIES =====
    
    @track allRecords = [];
    @track displayedRecords = [];
    @track columns = [];
    @track isLoading = false;
    @track isLoadingMore = false;
    @track error = null;
    @track hasData = false;
    @track hasMoreRecords = false;
    @track currentOffset = 0;
    @track detectedObjectType = null;
    @track sortedBy = '';
    @track sortDirection = 'asc';
    
    // Performance and state tracking
    lastDataSignature = '';
    lastUISignature = '';
    isInitialized = false;
    lastLoadTime = 0;
    
    // ===== COMPUTED CONFIGURATION PROPERTIES =====
    
    get configObj() {
        try {
            return JSON.parse(this.configJSONString);
        } catch (e) {
            console.error('Invalid JSON in configJSONString:', e);
            return {};
        }
    }
    
    // Get the current record
    get currentRecordId() {
        // Priority 1: Use configured recordId from CPE
        const configuredRecordId = this.configObj.recordId;
        if (configuredRecordId && 
            configuredRecordId.trim() !== '' &&
            configuredRecordId !== '{!recordId}' && 
            configuredRecordId !== 'undefined') {
            console.log('Using configured record ID:', configuredRecordId);
            return configuredRecordId;
        }
        
        // Priority 2: Use API recordId (from Experience Cloud automatic injection)
        if (this.recordId && 
            this.recordId !== '{!recordId}' && 
            this.recordId !== 'undefined' && 
            this.recordId.trim() !== '') {
            console.log('Using Experience Cloud record ID:', this.recordId);
            return this.recordId;
        }
        
        console.log('No valid record ID available');
        return null;
    }

    // UI Configuration - instant response
    get numberOfSlots() {
        return this.configObj.numberOfSlots || 'None';
    }
    
    get relatedListIcon() {
        return this.configObj.relatedListIcon || '';
    }
    
    get relatedListLabel() {
        return this.configObj.relatedListLabel || 'Related Records';
    }
    
    get showViewMore() {
        return this.configObj.showViewMore || false;
    }
    
    get showViewAll() {
        return this.configObj.showViewAll || false;
    }
    
    get viewAllUrl() {
        return this.configObj.viewAllUrl || '';
    }
    
    // Data Source Mode - KEY PROPERTY
    get useCustomQuery() {
        return this.configObj.useCustomQuery || false;
    }
    
    // SOQL Mode Properties
    get soqlQuery() {
        return this.configObj.soqlQuery || '';
    }
    
    get displayFields() {
        return this.configObj.displayFields || '';
    }
    
    // ARL Mode Properties
    get relatedListName() {
        return this.configObj.relatedListName || '';
    }
    
    get fieldNames() {
        return this.configObj.fieldNames || '';
    }

    get relationshipField() {
        return this.configObj.relationshipField || '';
    }
    
    get enabledFields() {
        return this.configObj.enabledFields || '';
    }

    get customFieldNamesList() {
        if (!this.fieldNames || this.fieldNames.trim() === '') {
            return [];
        }
        return this.fieldNames.split(',').map(name => name.trim()).filter(name => name.length > 0);
    }

    getCustomFieldLabel(fieldInfo, index) {
        const customNames = this.customFieldNamesList;
        
        // If we have a custom name for this index, use it
        if (customNames.length > index) {
            console.log(`Using custom name for field ${index}: "${customNames[index]}" instead of "${fieldInfo.label}"`);
            return customNames[index];
        }
        
        // Otherwise, use the original field label
        return fieldInfo.label;
    }
    
    // Record Linking
    get recordPageUrl() {
        return this.configObj.recordPageUrl || '';
    }
    
    get enableRecordLinking() {
        return this.configObj.enableRecordLinking || false;
    }
    
    // Table Configuration
    get initialRecordsToLoad() {
        return this.configObj.initialRecordsToLoad || 6;
    }
    
    get defaultColumnWidth() {
        return this.configObj.defaultColumnWidth || null;
    }
    
    get hideCheckboxColumn() {
        return this.configObj.hideCheckboxColumn !== undefined ? this.configObj.hideCheckboxColumn : true;
    }
    
    get showRowNumberColumn() {
        return this.configObj.showRowNumberColumn !== undefined ? this.configObj.showRowNumberColumn : false;
    }
    
    get resizeColumnDisabled() {
        return this.configObj.resizeColumnDisabled || false;
    }

    get columnSortingDisabled() {
        return this.configObj.columnSortingDisabled || false;
    }
    
    get enableInfiniteLoading() {
        return this.configObj.enableInfiniteLoading || false;
    }

    get fixedTableHeader() {
        return this.configObj.fixedTableHeader || false;
    }
    
    // ===== SMART CHANGE DETECTION =====
    
    get dataSignature() {
        // Create signature for data-affecting properties based on mode
        if (this.useCustomQuery) {
            // SOQL mode signature
            return JSON.stringify({
                mode: 'soql',
                recordId: this.currentRecordId,
                soqlQuery: this.soqlQuery,
                displayFields: this.displayFields
            });
        } else {
            // ARL mode signature
            return JSON.stringify({
                mode: 'arl',
                recordId: this.currentRecordId,
                relatedListName: this.relatedListName,
                relationshipField: this.relationshipField,
                enabledFields: this.enabledFields,
                detectedObjectType: this.detectedObjectType
            });
        }
    }
    
    get uiSignature() {
        return JSON.stringify({
            numberOfSlots: this.numberOfSlots,
            relatedListIcon: this.relatedListIcon,
            relatedListLabel: this.relatedListLabel,
            showViewMore: this.showViewMore,
            showViewAll: this.showViewAll,
            viewAllUrl: this.viewAllUrl,
            enableRecordLinking: this.enableRecordLinking,
            recordPageUrl: this.recordPageUrl,
            fieldNames: this.fieldNames,
            defaultColumnWidth: this.defaultColumnWidth,
            hideCheckboxColumn: this.hideCheckboxColumn,
            showRowNumberColumn: this.showRowNumberColumn,
            resizeColumnDisabled: this.resizeColumnDisabled,
            columnSortingDisabled: this.columnSortingDisabled, 
            enableInfiniteLoading: this.enableInfiniteLoading,
            fixedTableHeader: this.fixedTableHeader
        });
    }
    
    get shouldReloadData() {
        return this.dataSignature !== this.lastDataSignature;
    }
    
    get shouldRebuildColumns() {
        return this.uiSignature !== this.lastUISignature;
    }
    
    get dataSourceMode() {
        return this.useCustomQuery ? 'Custom SOQL' : 'Related List API';
    }
    
    // ===== UI STATE GETTERS =====
    
    // Slot visibility getters - instant response
    get showSlot1() {
        return this.numberOfSlots !== 'None';
    }
    
    get showSlot2() {
        return ['Two', 'Three', 'Four'].includes(this.numberOfSlots);
    }
    
    get showSlot3() {
        return ['Three', 'Four'].includes(this.numberOfSlots);
    }
    
    get showSlot4() {
        return this.numberOfSlots === 'Four';
    }
    
    // UI state getters
    get hasIcon() {
        return this.relatedListIcon && this.relatedListIcon.includes(':');
    }
    
    get showActionButtonContainer() {
        return this.showViewMore || this.showViewAll;
    }
    
    get actionButtonContainerClass() {
        const base = 'slds-text-align_center slds-m-top_medium compact-action-buttons';
        if (this.showViewMore && this.showViewAll) {
            return `${base} action-button-container-dual`;
        }
        return `${base} action-button-container-single`;
    }
    
    get showEmptyState() {
        return !this.isLoading && !this.error && !this.hasData;
    }
    
    get showTable() {
        return !this.isLoading && !this.error && this.hasData && this.displayedRecords.length > 0;
    }
    
    get showLoadMoreButton() {
        return this.showTable && this.hasMoreRecords && this.showViewMore;
    }
    
    get loadMoreButtonLabel() {
        const remainingRecords = this.allRecords.length - this.displayedRecords.length;
        const nextBatchSize = Math.min(remainingRecords, this.initialRecordsToLoad);
        return `Load More (${nextBatchSize} more)`;
    }
    
    // For template boolean properties
    get hideCheckboxColumnValue() {
        return this.hideCheckboxColumn;
    }
    
    get showRowNumberColumnValue() {
        return this.showRowNumberColumn;
    }

    get tableContainerClass() {
        let baseClass = 'responsive-table-container';
        
        if (this.fixedTableHeader) {
            return `${baseClass} fixed-header-table`;
        } else {
            return `${baseClass} limited-height-table`;
        }
    }
    
    // Validation
    get hasValidConfiguration() {
        if (this.useCustomQuery) {
            // SOQL mode validation (unchanged)
            const hasQuery = !!(this.soqlQuery && this.soqlQuery.trim() !== '');
            const usesRecordIdVariable = this.soqlQuery && this.soqlQuery.includes('$recordId');
            const hasRecordId = !!(this.currentRecordId);
            const recordIdValid = !usesRecordIdVariable || hasRecordId;
            
            console.log('SOQL Validation:', {
                hasQuery,
                hasRecordId,
                usesRecordIdVariable,
                recordIdValid,
                canProceed: hasQuery && recordIdValid
            });
            
            return hasQuery && recordIdValid;
        } else {
            // ARL mode validation - enabledFields is recommended but not strictly required
            const hasRelatedListName = !!(this.relatedListName);
            const hasRecordId = !!(this.currentRecordId);
            const hasDetectedObjectType = !!(this.detectedObjectType);
            
            console.log('ARL Validation:', {
                hasRelatedListName,
                hasRecordId,
                hasDetectedObjectType,
                relatedListName: this.relatedListName,
                recordId: this.currentRecordId,
                detectedObjectType: this.detectedObjectType,
                enabledFields: this.enabledFields,
                relationshipField: this.relationshipField,
                canProceed: hasRelatedListName && hasRecordId && hasDetectedObjectType
            });
            
            return hasRelatedListName && hasRecordId && hasDetectedObjectType;
        }
    }
    
    // Debug properties
    get showDebugInfo() {
        return this.configObj.showDebugInfo || false;
    }
    
    // ===== DEBUG METHODS =====
    
    debugConfiguration() {
        console.log('=== SlotTest Configuration Debug ===');
        console.log('useCustomQuery:', this.useCustomQuery);
        console.log('soqlQuery:', this.soqlQuery);
        console.log('displayFields:', this.displayFields);
        console.log('configured recordId:', this.configObj.recordId);
        console.log('API recordId (from Experience Cloud):', this.recordId);
        console.log('currentRecordId (final resolved):', this.currentRecordId);
        console.log('detectedObjectType:', this.detectedObjectType);
        console.log('hasValidConfiguration:', this.hasValidConfiguration);
        console.log('shouldReloadData:', this.shouldReloadData);
        console.log('dataSignature:', this.dataSignature);
        console.log('lastDataSignature:', this.lastDataSignature);
        console.log('configJSONString:', this.configJSONString);
        console.log('====================================');
    }
    
    // ===== LIFECYCLE HOOKS =====
    
    connectedCallback() {
        console.log(`SlotTest connected with CPE integration - Mode: ${this.dataSourceMode}`);
        console.log('Configuration:', this.configObj);
        this.isInitialized = true;
        this.detectObjectTypeAndLoadData();
    }
    
    renderedCallback() {
        if (!this.isInitialized) {
            return;
        }
        
        // Smart change detection - only reload what's necessary
        if (this.shouldReloadData) {
            console.log('Data signature changed, reloading data');
            console.log('Previous signature:', this.lastDataSignature);
            console.log('Current signature:', this.dataSignature);
            this.loadData();
        } else if (this.shouldRebuildColumns && this.hasData) {
            console.log('UI signature changed, rebuilding columns only');
            this.rebuildColumnsOnly();
        }
    }
    
    // ===== DATA LOADING ORCHESTRATION =====
    
    async detectObjectTypeAndLoadData() {
        console.log('detectObjectTypeAndLoadData called with recordId:', this.currentRecordId);
        
        // If we have a SOQL query that doesn't use $recordId, skip recordId validation
        if (this.useCustomQuery && this.soqlQuery && !this.soqlQuery.includes('$recordId')) {
            console.log('SOQL query does not use $recordId, proceeding without record context');
            this.loadData();
            return;
        }
        
        if (!this.currentRecordId) {
            console.log('No valid record ID for processing');
            this.clearData();
            return;
        }
        
        try {
            // Always detect object type (needed for both modes)
            this.detectedObjectType = await getObjectTypeFromRecordId({ recordId: this.currentRecordId });
            console.log('Detected object type:', this.detectedObjectType);
            
            if (this.detectedObjectType) {
                // Force a signature update to trigger reload
                this.lastDataSignature = '';
                this.loadData();
            } else {
                this.error = 'Could not determine object type from record ID';
            }
        } catch (error) {
            console.error('Error detecting object type:', error);
            this.error = 'Could not determine object type from record ID';
        }
    }
    
    async loadData() {
        // Debug configuration first
        this.debugConfiguration();
        
        if (!this.hasValidConfiguration) {
            console.log(`Invalid configuration for ${this.dataSourceMode} mode, skipping data load`);
            this.clearData();
            return;
        }
        
        const startTime = performance.now();
        console.log(`Loading data using ${this.dataSourceMode} mode`);
        
        this.isLoading = true;
        this.error = null;
        
        try {
            // Route to appropriate data loading method based on mode
            if (this.useCustomQuery) {
                await this.loadDataWithSOQL();
            } else {
                await this.loadDataWithARL();
            }
            
            // Update signatures to prevent unnecessary reloads
            this.lastDataSignature = this.dataSignature;
            this.lastUISignature = this.uiSignature;
            
            const endTime = performance.now();
            this.lastLoadTime = Math.round(endTime - startTime);
            console.log(`Data loading (${this.dataSourceMode}) took ${this.lastLoadTime}ms`);
            console.log(`Loaded ${this.allRecords.length} records successfully`);
            
        } catch (error) {
            console.error(`Error loading data in ${this.dataSourceMode} mode:`, error);
            this.error = error.body?.message || error.message || 'Unknown error occurred';
            this.clearData();
        } finally {
            this.isLoading = false;
        }
    }
    
    // Fast column rebuild for UI-only changes (no data reload)
    async rebuildColumnsOnly() {
        console.log('Rebuilding columns only (no data reload)');
        
        if (!this.hasData || this.allRecords.length === 0) {
            return;
        }
        
        try {
            if (this.useCustomQuery) {
                // For SOQL mode, rebuild columns from field info
                const objectName = this.extractObjectNameFromQuery(this.soqlQuery);
                if (objectName) {
                    const fieldInfos = await getFieldInfo({ 
                        objectApiName: objectName, 
                        fieldList: this.displayFields 
                    });
                    this.columns = this.buildColumnsFromSOQL(fieldInfos);
                }
            } else {
                // For ARL mode, we'd need to call the API again
                // For now, just reprocess existing records
                console.log('ARL column rebuild requires data reload');
                this.loadData();
                return;
            }
            
            // Reprocess records for new linking configuration
            this.allRecords = this.reprocessRecordsForLinking(this.allRecords);
            this.updateDisplayedRecords();
            
            // Update UI signature
            this.lastUISignature = this.uiSignature;
            
        } catch (error) {
            console.error('Error rebuilding columns:', error);
            // Fall back to full data reload
            this.loadData();
        }
    }
    
    reprocessRecordsForLinking(records) {
        return records.map(record => {
            const processedRecord = { ...record };
            
            // Remove old recordUrl if it exists
            delete processedRecord.recordUrl;
            
            // Add new recordUrl if linking is enabled
            if (this.enableRecordLinking && this.recordPageUrl && record.Id) {
                processedRecord.recordUrl = this.buildRecordUrl(record.Id);
            }
            
            // Re-flatten relationship fields for ARL mode
            if (!this.useCustomQuery) {
                this.flattenRelationshipFieldsForARL(processedRecord, records.length > 0 ? records[0] : {});
            }
            
            return processedRecord;
        });
    }
    
    // ===== ARL MODE DATA LOADING =====
    
    async loadDataWithARL() {
        console.log('Using Related List API data loading method');
        
        if (!this.relatedListName || !this.detectedObjectType) {
            throw new Error('Related List Name and Object Type are required for ARL mode');
        }
        
        console.log('ARL Parameters:', {
            objectApiName: this.detectedObjectType,
            relatedListName: this.relatedListName,
            recordId: this.currentRecordId,
            enabledFields: this.enabledFields,
            relationshipField: this.relationshipField
        });
        
        const response = await getRelatedListInfo({
            objectApiName: this.detectedObjectType,
            relatedListName: this.relatedListName,
            recordId: this.currentRecordId,
            enabledFields: this.enabledFields || '',
            relationshipField: this.relationshipField || ''
        });
        
        console.log('ARL Response:', response);
        
        if (response?.fields) {
            this.columns = this.buildColumnsFromARL(response.fields);
            this.allRecords = this.processARLRecords(response.records || []);
            this.currentOffset = 0;
            this.updateDisplayedRecords();
            this.hasData = this.allRecords.length > 0;
            
            console.log(`ARL Success: ${this.columns.length} columns, ${this.allRecords.length} records`);
        } else {
            throw new Error('No field information returned from Related List API');
        }
    }
    
    buildColumnsFromARL(fields) {
        return fields.map((field, index) => {
            const column = {
                label: this.getCustomFieldLabel(field, index), // Use custom field names
                fieldName: this.getDisplayFieldNameForARL(field.apiName),
                type: this.mapFieldTypeToDataTableType(field.type),
                sortable: !this.columnSortingDisabled
            };
            
            if (this.defaultColumnWidth && this.defaultColumnWidth > 0) {
                column.fixedWidth = this.defaultColumnWidth;
            }
            
            // Enable linking on first column if configured
            if (index === 0 && this.enableRecordLinking && this.recordPageUrl) {
                column.type = 'url';
                column.typeAttributes = {
                    label: { fieldName: this.getDisplayFieldNameForARL(field.apiName) },
                    target: '_blank'
                };
                column.fieldName = 'recordUrl';
            }
            
            return column;
        });
    }
    
    processARLRecords(records) {
        return records.map(record => {
            const processedRecord = { ...record };
            
            // Add record URL for linking
            if (this.enableRecordLinking && this.recordPageUrl && record.Id) {
                processedRecord.recordUrl = this.buildRecordUrl(record.Id);
            }
            
            // Flatten relationship fields for ARL mode
            this.flattenRelationshipFieldsForARL(processedRecord, records.length > 0 ? records[0] : {});
            
            return processedRecord;
        });
    }
    
    getDisplayFieldNameForARL(fieldApiName) {
        // Use the consistent flattening method for ARL fields
        return this.getFlattenedFieldName(fieldApiName);
    }

    getFlattenedFieldName(fieldApiName) {
        if (fieldApiName.includes('.')) {
            return fieldApiName.replace('.', '_');
        }
        return fieldApiName;
    }

    flattenRelationshipFieldsForARL(record, sampleRecord) {
        // Handle relationship fields by flattening the nested objects
        // This processes fields like "Account.Name" into "Account_Name"
        Object.keys(sampleRecord || {}).forEach(key => {
            if (key.includes('.')) {
                const parts = key.split('.');
                const relationshipName = parts[0];
                const fieldName = parts[1];
                
                // Create a flattened field name for the datatable
                const flattenedFieldName = this.getFlattenedFieldName(key);
                
                // Extract the value from the nested relationship
                if (record[relationshipName] && record[relationshipName][fieldName] !== undefined) {
                    record[flattenedFieldName] = record[relationshipName][fieldName];
                    console.log(`Flattened ARL field ${key} -> ${flattenedFieldName}: ${record[flattenedFieldName]}`);
                } else {
                    record[flattenedFieldName] = null;
                    console.log(`Flattened ARL field ${key} -> ${flattenedFieldName}: null (no data)`);
                }
            }
        });
    }

    // ===== SOQL MODE DATA LOADING =====
    
    async loadDataWithSOQL() {
        console.log('Using SOQL data loading method');
        console.log('SOQL Query:', this.soqlQuery);
        console.log('Display Fields:', this.displayFields);
        
        const [fieldInfos, queryResult] = await Promise.all([
            this.getFieldInfos(),
            this.executeQuery()
        ]);
        
        console.log('Field Infos received:', fieldInfos);
        console.log('Query Result received:', queryResult);
        
        this.columns = this.buildColumnsFromSOQL(fieldInfos);
        this.allRecords = this.flattenRecords(queryResult.records || []);
        this.currentOffset = 0;
        this.updateDisplayedRecords();
        
        console.log('SOQL data loading completed');
        console.log('Columns:', this.columns);
        console.log('Records:', this.allRecords);
    }
    
    // FIXED: Enhanced getFieldInfos with better error handling and field parsing
    async getFieldInfos() {
        // If displayFields is empty, parse it from the query
        let fieldsToUse = this.displayFields;
        
        if (!fieldsToUse || fieldsToUse.trim() === '') {
            console.log('displayFields is empty, parsing from SOQL query');
            fieldsToUse = this.parseFieldsFromQuery(this.soqlQuery);
        }
        
        if (!fieldsToUse || fieldsToUse.trim() === '') {
            console.warn('No fields available for processing');
            return [];
        }
        
        const objectName = this.extractObjectNameFromQuery(this.soqlQuery);
        if (!objectName) {
            throw new Error('Could not determine object type from SOQL query');
        }
        
        console.log('Getting field info for object:', objectName, 'fields:', fieldsToUse);
        
        return await getFieldInfo({ 
            objectApiName: objectName, 
            fieldList: fieldsToUse 
        });
    }
    
    // NEW: Parse fields from SOQL query as backup
    parseFieldsFromQuery(query) {
        try {
            if (!query || query.trim() === '') {
                return '';
            }
            
            const normalizedQuery = query.replace(/\s+/g, ' ').trim();
            const selectMatch = normalizedQuery.match(/SELECT\s+(.*?)\s+FROM/i);
            
            if (!selectMatch) {
                console.warn('Could not parse SELECT fields from query');
                return '';
            }
            
            const fieldsString = selectMatch[1];
            // Clean up the fields and return as comma-separated string
            const fields = fieldsString.split(',').map(field => field.trim()).filter(field => field);
            
            console.log('Parsed fields from query:', fields);
            return fields.join(', ');
        } catch (error) {
            console.error('Error parsing fields from query:', error);
            return '';
        }
    }
    
    async executeQuery() {
        console.log('Executing SOQL query:', this.soqlQuery);
        
        const result = await executeQuery({ 
            soqlQuery: this.soqlQuery, 
            recordId: this.currentRecordId
        });
        
        console.log('Query execution result:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return result;
    }
    
    extractObjectNameFromQuery(query) {
        try {
            const fromMatch = query.match(/FROM\s+(\w+)/i);
            return fromMatch ? fromMatch[1] : null;
        } catch (error) {
            console.error('Error extracting object name:', error);
            return null;
        }
    }
    
    buildColumnsFromSOQL(fieldInfos) {
        console.log('Building columns from field infos:', fieldInfos);
        
        return fieldInfos.map((fieldInfo, index) => {
            const column = {
                label: this.getCustomFieldLabel(fieldInfo, index),
                fieldName: fieldInfo.apiName,
                type: this.mapFieldTypeToDataTableType(fieldInfo.type),
                sortable: !this.columnSortingDisabled // Add this line
            };
            
            if (this.defaultColumnWidth && this.defaultColumnWidth > 0) {
                column.fixedWidth = this.defaultColumnWidth;
            }
            
            // Enable linking on first column if configured
            if (index === 0 && this.enableRecordLinking && this.recordPageUrl) {
                column.type = 'url';
                column.typeAttributes = {
                    label: { fieldName: fieldInfo.apiName },
                    target: '_blank'
                };
                column.fieldName = 'recordUrl';
                // URL columns can still be sortable - they'll sort by the label
            }
            
            console.log('Created column:', column);
            
            return column;
        });
    }
    
    flattenRecords(records) {
        console.log('Flattening records:', records);
        
        return records.map(record => {
            const flatRecord = { ...record };
            
            // Handle relationship fields for SOQL mode
            if (this.displayFields) {
                const fieldNames = this.displayFields.split(',').map(f => f.trim());
                fieldNames.forEach(fieldName => {
                    if (fieldName.includes('.')) {
                        const [relationshipName, targetField] = fieldName.split('.');
                        if (record[relationshipName] && record[relationshipName][targetField]) {
                            flatRecord[fieldName] = record[relationshipName][targetField];
                        } else {
                            flatRecord[fieldName] = null;
                        }
                    }
                });
            }
            
            // Add record URL for linking
            if (this.enableRecordLinking && this.recordPageUrl && record.Id) {
                flatRecord.recordUrl = this.buildRecordUrl(record.Id);
            }
            
            return flatRecord;
        });
    }
    
    // ===== SHARED UTILITY METHODS =====
    
    clearData() {
        this.allRecords = [];
        this.displayedRecords = [];
        this.columns = [];
        this.hasData = false;
        this.hasMoreRecords = false;
        this.currentOffset = 0;
        this.clearSort();
    }
    
    buildRecordUrl(recordId) {
        if (!this.recordPageUrl || !recordId) {
            return null;
        }
        
        let url = this.recordPageUrl;
        
        if (url.includes(':recordId')) {
            url = url.replace(':recordId', recordId);
        } else if (url.includes('{recordId}')) {
            url = url.replace('{recordId}', recordId);
        } else {
            url = url.endsWith('/') ? url + recordId : url + '/' + recordId;
        }
        
        return url;
    }
    
    updateDisplayedRecords() {
        const pageSize = this.initialRecordsToLoad;
        const endIndex = this.currentOffset + pageSize;
        
        this.displayedRecords = this.allRecords.slice(0, endIndex);
        this.hasData = this.displayedRecords.length > 0;
        this.hasMoreRecords = endIndex < this.allRecords.length;
        
        console.log(`Showing ${this.displayedRecords.length} of ${this.allRecords.length} records`);
    }
    
    mapFieldTypeToDataTableType(fieldType) {
        const typeMap = {
            'STRING': 'text',
            'TEXTAREA': 'text',
            'EMAIL': 'email',
            'PHONE': 'phone',
            'URL': 'url',
            'CURRENCY': 'currency',
            'PERCENT': 'percent',
            'NUMBER': 'number',
            'DOUBLE': 'number',
            'INTEGER': 'number',
            'DATE': 'date',
            'DATETIME': 'date',
            'TIME': 'time',
            'BOOLEAN': 'boolean',
            'PICKLIST': 'text',
            'MULTIPICKLIST': 'text',
            'REFERENCE': 'text'
        };
        
        return typeMap[fieldType?.toUpperCase()] || 'text';
    }
    
    // ===== EVENT HANDLERS =====
    
    handleRefresh() {
        console.log(`Refresh clicked - Mode: ${this.dataSourceMode}`);
        this.clearData();
        this.loadData();
    }
    
    handleViewMore() {
        console.log('View More clicked');
        this.isLoadingMore = true;
        
        try {
            this.currentOffset += this.initialRecordsToLoad;
            this.updateDisplayedRecords();
        } catch (error) {
            console.error('Error loading more records:', error);
        } finally {
            this.isLoadingMore = false;
        }
    }
    
    handleViewAll() {
        console.log('View All clicked');
        
        // If viewAllUrl is configured, navigate to it
        if (this.viewAllUrl && this.viewAllUrl.trim() !== '') {
            console.log('Navigating to View All URL:', this.viewAllUrl);
            this.navigateToViewAllUrl();
        } else {
            // Fall back to showing all records in current table
            console.log('No View All URL configured, showing all records in table');
            if (this.allRecords.length > 0) {
                this.displayedRecords = [...this.allRecords];
                this.hasMoreRecords = false;
                console.log('Showing all', this.displayedRecords.length, 'records');
            }
        }
    }

    handleSort(event) {
        try {
            const { fieldName: sortedBy, sortDirection } = event.detail;
            console.log('Column sort requested:', sortedBy, sortDirection);
            
            this.sortedBy = sortedBy;
            this.sortDirection = sortDirection;
            
            // Sort the allRecords array
            this.sortData(sortedBy, sortDirection);
            
            // Reset pagination and update displayed records
            this.currentOffset = 0;
            this.updateDisplayedRecords();
            
        } catch (error) {
            console.error('Error handling sort:', error);
        }
    }


    sortData(fieldName, direction) {
        try {
            console.log('Sorting data by field:', fieldName, 'direction:', direction);
            
            // Create a copy of allRecords for sorting
            const recordsToSort = [...this.allRecords];
            
            recordsToSort.sort((a, b) => {
                let aVal = this.getFieldValue(a, fieldName);
                let bVal = this.getFieldValue(b, fieldName);
                
                // Handle null/undefined values
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return direction === 'asc' ? -1 : 1;
                if (bVal == null) return direction === 'asc' ? 1 : -1;
                
                // Convert to strings for comparison if they're not already
                if (typeof aVal !== 'string' && typeof aVal !== 'number') {
                    aVal = String(aVal);
                }
                if (typeof bVal !== 'string' && typeof bVal !== 'number') {
                    bVal = String(bVal);
                }
                
                // Perform comparison
                let result = 0;
                if (aVal < bVal) {
                    result = -1;
                } else if (aVal > bVal) {
                    result = 1;
                }
                
                return direction === 'asc' ? result : -result;
            });
            
            this.allRecords = recordsToSort;
            console.log('Data sorted successfully');
            
        } catch (error) {
            console.error('Error sorting data:', error);
        }
    }

    getFieldValue(record, fieldName) {
        try {
            // Handle direct field access
            if (record.hasOwnProperty(fieldName)) {
                return record[fieldName];
            }
            
            // Handle relationship fields (e.g., Account.Name)
            if (fieldName.includes('.')) {
                const [relationshipName, targetField] = fieldName.split('.');
                if (record[relationshipName] && record[relationshipName][targetField]) {
                    return record[relationshipName][targetField];
                }
            }
            
            // For URL columns, use the original field value for sorting
            if (fieldName === 'recordUrl' && this.displayFields) {
                // Get the first display field as it's used for the URL column
                const firstField = this.displayFields.split(',')[0]?.trim();
                if (firstField && record[firstField]) {
                    return record[firstField];
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting field value:', error);
            return null;
        }
    }
    
    clearSort() {
        this.sortedBy = '';
        this.sortDirection = 'asc';
    }

    handleLoadMore(event) {
        try {
            console.log('Infinite loading triggered');
            
            // Prevent loading if we're already loading or no more records
            if (this.isLoadingMore || !this.hasMoreRecords) {
                return;
            }
            
            this.isLoadingMore = true;
            
            // Load next batch of records
            this.currentOffset += this.initialRecordsToLoad;
            this.updateDisplayedRecords();
            
            // Small delay to show loading state
            setTimeout(() => {
                this.isLoadingMore = false;
            }, 300);
            
        } catch (error) {
            console.error('Error in infinite loading:', error);
            this.isLoadingMore = false;
        }
    }

    navigateToViewAllUrl() {
        // Build the full URL by appending to current site base URL
        const baseUrl = window.location.origin + window.location.pathname.split('/s/')[0] + '/s';
        const fullUrl = baseUrl + this.viewAllUrl;
        
        console.log('Full View All URL:', fullUrl);
        
        // Use standard navigation
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: fullUrl
            }
        });
    }
}