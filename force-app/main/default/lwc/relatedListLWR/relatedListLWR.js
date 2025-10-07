import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import executeQuery from '@salesforce/apex/RelatedListLWRController.executeQuery';
import getFieldInfo from '@salesforce/apex/RelatedListLWRController.getFieldInfo';
import getRelatedListInfo from '@salesforce/apex/RelatedListLWRController.getRelatedListInfo';
import getObjectTypeFromRecordId from '@salesforce/apex/RelatedListLWRController.getObjectTypeFromRecordId';
import getCaseArticles from '@salesforce/apex/RelatedListLWRController.getCaseArticles';
import getFiles from '@salesforce/apex/RelatedListLWRController.getFiles';
import getImageAsBase64 from '@salesforce/apex/RelatedListLWRController.getImageAsBase64';

/**
 * @slot iconSlot
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

    // Keep @track only for arrays that are mutated internally
    @track allRecords = [];
    @track displayedRecords = [];
    @track columns = [];

    // Fix #2: Remove @track from primitives - they're still reactive without it
    isLoading = false;
    isLoadingMore = false;
    error = null;
    hasData = false;
    hasMoreRecords = false;
    currentOffset = 0;
    detectedObjectType = null;
    sortedBy = '';
    sortDirection = 'asc';

    // File-specific state (primitives - no @track needed)
    showImageModal = false;
    modalImageUrl = '';
    modalDownloadUrl = '';
    modalImageName = '';
    modalImageSize = '';
    modalImageLoadError = '';
    isLoadingModalImage = false;
    
    // Performance and state tracking
    lastDataSignature = '';
    lastUISignature = '';
    isInitialized = false;
    lastLoadTime = 0;

    // Performance metrics tracking
    _perfMetrics = {
        configObjAccessCount: 0,
        dataSignatureAccessCount: 0,
        uiSignatureAccessCount: 0,
        renderCallbackCount: 0,
        lastRenderTime: 0
    };

    // Cached config object (Fix #1: Cache JSON.parse result)
    _cachedConfigObj = null;
    _lastConfigString = '';

    // Cached signatures (Fix #3: Cache JSON.stringify results)
    _cachedDataSignature = null;
    _cachedUiSignature = null;
    _lastSignatureInputs = {
        recordId: null,
        soqlQuery: null,
        displayFields: null,
        relatedListName: null,
        relationshipField: null,
        enabledFields: null,
        detectedObjectType: null,
        relatedListType: null,
        numberOfSlots: null,
        iconType: null,
        relatedListIcon: null,
        fieldNames: null
    };

    // Fix #6: Cache computed label
    _cachedLabel = null;
    _lastRecordCount = -1;

    // Fix #7: Cache field name parsing
    _cachedFieldNamesList = null;
    _lastFieldNames = '';
    
    // ===== UTILITY METHODS FOR DEBUGGING =====
    
    debugLog(message, ...args) {
        if (this.showDebugInfo) {
            //console.log(`[SlotTest Debug] ${message}`, ...args);
        }
    }
    
    debugWarn(message, ...args) {
        if (this.showDebugInfo) {
            //console.warn(`[SlotTest Debug] ${message}`, ...args);
        }
    }
    
    debugError(message, ...args) {
        if (this.showDebugInfo) {
            //console.error(`[SlotTest Debug] ${message}`, ...args);
        }
    }
    
    // Always log errors regardless of debug mode
    logError(message, ...args) {
        //console.error(`[SlotTest Error] ${message}`, ...args);
    }
    
    // ===== COMPUTED CONFIGURATION PROPERTIES =====
    
    get configObj() {
        this._perfMetrics.configObjAccessCount++;

        // Fix #1: Only parse JSON when the string actually changes
        if (this.configJSONString !== this._lastConfigString) {
            try {
                this._cachedConfigObj = JSON.parse(this.configJSONString);
                this._lastConfigString = this.configJSONString;
            } catch (e) {
                this.logError('Invalid JSON in configJSONString:', e);
                this._cachedConfigObj = {};
            }
        }

        return this._cachedConfigObj;
    }
    
    // Get the current record
    get currentRecordId() {
        // Priority 1: Use configured recordId from CPE
        const configuredRecordId = this.configObj.recordId;
        if (configuredRecordId && 
            configuredRecordId.trim() !== '' &&
            configuredRecordId !== '{!recordId}' && 
            configuredRecordId !== 'undefined') {
            this.debugLog('Using configured record ID:', configuredRecordId);
            return configuredRecordId;
        }
        
        // Priority 2: Use API recordId (from Experience Cloud automatic injection)
        if (this.recordId && 
            this.recordId !== '{!recordId}' && 
            this.recordId !== 'undefined' && 
            this.recordId.trim() !== '') {
            this.debugLog('Using Experience Cloud record ID:', this.recordId);
            return this.recordId;
        }
        
        this.debugLog('No valid record ID available');
        return null;
    }

    // UI Configuration - instant response
    get numberOfSlots() {
        return this.configObj.numberOfSlots || 'None';
    }
    
    get relatedListIcon() {
        return this.configObj.relatedListIcon || '';
    }

    get iconType() {
    return this.configObj.iconType || 'slds';
}

    get useIconSlot() {
        return this.iconType === 'slot';
    }
    
    get relatedListLabel() {
        // Fix #6: Only recalculate if record count changed
        if (this._lastRecordCount !== this.allRecords.length) {
            const baseLabel = this.configObj.relatedListLabel || 'Related Records';

            // Add count if we have data
            if (this.hasData && this.allRecords.length > 0) {
                this._cachedLabel = `${baseLabel} (${this.allRecords.length})`;
            } else {
                this._cachedLabel = baseLabel;
            }

            this._lastRecordCount = this.allRecords.length;
        }

        return this._cachedLabel;
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
        // Fix #7: Cache field name parsing to avoid repeated split/map/filter
        if (this.fieldNames !== this._lastFieldNames) {
            if (!this.fieldNames || this.fieldNames.trim() === '') {
                this._cachedFieldNamesList = [];
            } else {
                this._cachedFieldNamesList = this.fieldNames
                    .split(',')
                    .map(name => name.trim())
                    .filter(name => name.length > 0);
            }
            this._lastFieldNames = this.fieldNames;
        }

        return this._cachedFieldNamesList;
    }

    getCustomFieldLabel(fieldInfo, index) {
        const customNames = this.customFieldNamesList;
        
        // If we have a custom name for this index, use it
        if (customNames.length > index) {
            this.debugLog(`Using custom name for field ${index}: "${customNames[index]}" instead of "${fieldInfo.label}"`);
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

    get relatedListType() {
        return this.configObj.relatedListType || 'standard';
    }

    get isStandardType() {
        return this.relatedListType === 'standard';
    }

    get isFilesType() {
        return this.relatedListType === 'files';
    }

    get isArticlesType() {
        return this.relatedListType === 'articles';
    }

    get showArticles() {
        // Articles now use the regular table display
        return false;
    }
    
    // ===== SMART CHANGE DETECTION =====
    
    get dataSignature() {
        this._perfMetrics.dataSignatureAccessCount++;

        // Fix #3: Only regenerate signature if relevant properties changed
        const currentInputs = {
            recordId: this.currentRecordId,
            soqlQuery: this.soqlQuery,
            displayFields: this.displayFields,
            relatedListName: this.relatedListName,
            relationshipField: this.relationshipField,
            enabledFields: this.enabledFields,
            detectedObjectType: this.detectedObjectType,
            relatedListType: this.relatedListType
        };

        // Check if any relevant input changed
        const hasChanged = Object.keys(currentInputs).some(
            key => currentInputs[key] !== this._lastSignatureInputs[key]
        );

        if (hasChanged || !this._cachedDataSignature) {
            // Update cache
            Object.assign(this._lastSignatureInputs, currentInputs);

            // Create signature for data-affecting properties based on mode
            if (this.isArticlesType) {
                this._cachedDataSignature = JSON.stringify({
                    mode: 'articles',
                    recordId: this.currentRecordId
                });
            } else if (this.isFilesType) {
                this._cachedDataSignature = JSON.stringify({
                    mode: 'files',
                    recordId: this.currentRecordId
                });
            } else if (this.useCustomQuery) {
                // SOQL mode signature
                this._cachedDataSignature = JSON.stringify({
                    mode: 'soql',
                    recordId: this.currentRecordId,
                    soqlQuery: this.soqlQuery,
                    displayFields: this.displayFields
                });
            } else {
                // ARL mode signature
                this._cachedDataSignature = JSON.stringify({
                    mode: 'arl',
                    recordId: this.currentRecordId,
                    relatedListName: this.relatedListName,
                    relationshipField: this.relationshipField,
                    enabledFields: this.enabledFields,
                    detectedObjectType: this.detectedObjectType
                });
            }
        }

        return this._cachedDataSignature;
    }
    
    get uiSignature() {
        this._perfMetrics.uiSignatureAccessCount++;

        // Fix #3: Only regenerate signature if UI properties changed
        const currentUiInputs = {
            numberOfSlots: this.numberOfSlots,
            iconType: this.iconType,
            relatedListIcon: this.relatedListIcon,
            fieldNames: this.fieldNames,
            defaultColumnWidth: this.defaultColumnWidth,
            hideCheckboxColumn: this.hideCheckboxColumn,
            showRowNumberColumn: this.showRowNumberColumn,
            resizeColumnDisabled: this.resizeColumnDisabled,
            columnSortingDisabled: this.columnSortingDisabled
        };

        // Check if any UI input changed
        const hasChanged = Object.keys(currentUiInputs).some(
            key => currentUiInputs[key] !== this._lastSignatureInputs[key]
        );

        if (hasChanged || !this._cachedUiSignature) {
            // Update cache
            Object.assign(this._lastSignatureInputs, currentUiInputs);

            this._cachedUiSignature = JSON.stringify({
                numberOfSlots: this.numberOfSlots,
                iconType: this.iconType,
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
                displayMode: this.displayMode,
            });
        }

        return this._cachedUiSignature;
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
    
    // Icon display logic
    get showStandardIcon() {
        return this.iconType === 'slds' && this.hasIcon;
    }

    get showIconSlot() {
        return this.iconType === 'slot';
    }

    // UI state getters
    get hasIcon() {
        return this.relatedListIcon && this.relatedListIcon.includes(':');
    }
    
    get showActionButtonContainer() {
        // Only show if there's actually something to display
        const hasLoadMore = this.showLoadMoreButton && this.hasMoreRecords;
        const hasViewAll = this.showViewAll;
        return hasLoadMore || hasViewAll;
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
    
    get displayMode() {
        return this.configObj.displayMode || 'table';
    }

    get showTable() {
        return ((this.displayMode === 'table' && this.isStandardType) || 
                this.isArticlesType) &&  // Removed Files reference
            !this.isLoading && 
            !this.error && 
            this.hasData && 
            this.displayedRecords.length > 0;
    }

    get showCards() {
        return this.displayMode === 'cards' && 
            !this.isLoading && 
            !this.error && 
            this.hasData && 
            this.displayedRecords.length > 0 &&
            !this.isArticlesType; // Don't show cards for articles
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        
        this.debugLog('Row action:', actionName, row);
        
        if (actionName === 'viewFile') {
            // Handle file view action
            if (row.isImage) {
                this.handleImagePreview(row.contentDocumentId, row.title, row.formattedSize, row.downloadUrl);
            } else {
                this.handleDirectDownload(row.downloadUrl, row.title);
            }
        }
    }

    get firstFieldName() {
        if (this.columns.length === 0) return null;
        const firstCol = this.columns[0];
        // If linking is enabled, the fieldName becomes 'recordUrl', so get the original field name
        if (firstCol.fieldName === 'recordUrl' && firstCol.typeAttributes?.label?.fieldName) {
            return firstCol.typeAttributes.label.fieldName;
        }
        return firstCol.fieldName;
    }

    get cardFields() {
        // Return all fields except the first (which is shown as title)
        return this.columns.slice(1).map((col, index) => {
            // Get the actual field name, not 'recordUrl'
            let fieldName = col.fieldName;
            if (fieldName === 'recordUrl' && col.typeAttributes?.label?.fieldName) {
                fieldName = col.typeAttributes.label.fieldName;
            }
            
            return {
                fieldName: fieldName,
                label: col.label,
                // Add unique key for iteration
                key: `card-field-${index}`
            };
        });
    }

    get showLoadMoreButton() {
        const hasContent = this.showTable || this.showArticles || this.showFilesGrid;
        return hasContent && this.hasMoreRecords && this.showViewMore;
    }
    
    get loadMoreButtonLabel() {
        const remainingRecords = this.allRecords.length - this.displayedRecords.length;
        const nextBatchSize = Math.min(remainingRecords, this.initialRecordsToLoad);
        return `Load More (${nextBatchSize} more)`;
    }

    get showBothButtons() {
        return this.showLoadMoreButton && this.showViewAll;
    }
    
    // For template boolean properties
    get hideCheckboxColumnValue() {
        return this.hideCheckboxColumn;
    }
    
    get showRowNumberColumnValue() {
        return this.showRowNumberColumn;
    }

    get tableContainerClass() {
        // Only use fixed-header-table for cards view
        // Standard table display uses regular responsive container
        if (this.showCards) {
            return 'responsive-table-container fixed-header-table';
        }
        return 'responsive-table-container';
    }
    
    // Validation
    get hasValidConfiguration() {
        if (this.isArticlesType) {
            // Articles mode validation - just needs recordId
            const hasRecordId = !!(this.currentRecordId);
            this.debugLog('Articles Validation:', { hasRecordId });
            return hasRecordId;
        } else if (this.isFilesType) {
            // Files mode validation - just needs recordId
            const hasRecordId = !!(this.currentRecordId);
            this.debugLog('Files Validation:', { hasRecordId });
            return hasRecordId;
        } else if (this.useCustomQuery) {
            // SOQL mode validation (existing logic)
            const hasQuery = !!(this.soqlQuery && this.soqlQuery.trim() !== '');
            const usesRecordIdVariable = this.soqlQuery && this.soqlQuery.includes('$recordId');
            const hasRecordId = !!(this.currentRecordId);
            const recordIdValid = !usesRecordIdVariable || hasRecordId;
            
            this.debugLog('SOQL Validation:', {
                hasQuery,
                hasRecordId,
                usesRecordIdVariable,
                recordIdValid,
                canProceed: hasQuery && recordIdValid
            });
            
            return hasQuery && recordIdValid;
        } else {
            // ARL mode validation (existing logic)
            const hasRelatedListName = !!(this.relatedListName);
            const hasRecordId = !!(this.currentRecordId);
            const hasDetectedObjectType = !!(this.detectedObjectType);
            
            this.debugLog('ARL Validation:', {
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
    
    get showFilesGrid() {
        return this.isFilesType && 
            !this.isLoading && 
            !this.error && 
            this.hasData && 
            this.displayedRecords.length > 0;
    }

    get filesGridColumns() {
        return this.configObj.filesGridColumns || '2';
    }

    get filesGridClass() {
        return `files-grid-container files-grid-columns-${this.filesGridColumns}`;
    }

    get hasModalImageError() {
        return !!this.modalImageLoadError;
    }

    // Debug properties
    get showDebugInfo() {
        return this.configObj.showDebugInfo || false;
    }
    
    // ===== DEBUG METHODS =====
    
    debugConfiguration() {
        if (!this.showDebugInfo) return;
        
        this.debugLog('=== SlotTest Configuration Debug ===');
        this.debugLog('useCustomQuery:', this.useCustomQuery);
        this.debugLog('soqlQuery:', this.soqlQuery);
        this.debugLog('displayFields:', this.displayFields);
        this.debugLog('configured recordId:', this.configObj.recordId);
        this.debugLog('API recordId (from Experience Cloud):', this.recordId);
        this.debugLog('currentRecordId (final resolved):', this.currentRecordId);
        this.debugLog('detectedObjectType:', this.detectedObjectType);
        this.debugLog('hasValidConfiguration:', this.hasValidConfiguration);
        this.debugLog('shouldReloadData:', this.shouldReloadData);
        this.debugLog('dataSignature:', this.dataSignature);
        this.debugLog('lastDataSignature:', this.lastDataSignature);
        this.debugLog('configJSONString:', this.configJSONString);
        this.debugLog('====================================');
    }
    
    // ===== LIFECYCLE HOOKS =====
    
    connectedCallback() {
        this.debugLog(`SlotTest connected with CPE integration - Mode: ${this.dataSourceMode}`);
        this.debugLog('Configuration:', this.configObj);
        this.isInitialized = true;
        this.detectObjectTypeAndLoadData();
    }
    
    renderedCallback() {
        const renderStart = performance.now();
        this._perfMetrics.renderCallbackCount++;

        if (!this.isInitialized) {
            return;
        }

        // Don't interfere with manual refresh
        if (this.isRefreshing) {
            return;
        }

        // Smart change detection - only reload what's necessary
        if (this.shouldReloadData) {
            this.debugLog('Data signature changed, reloading data');
            this.debugLog('Previous signature:', this.lastDataSignature);
            this.debugLog('Current signature:', this.dataSignature);
            this.loadData();
        } else if (this.shouldRebuildColumns && this.hasData) {
            this.debugLog('UI signature changed, rebuilding columns only');
            this.rebuildColumnsOnly();
        }

        const renderEnd = performance.now();
        this._perfMetrics.lastRenderTime = renderEnd - renderStart;
    }
    
    // ===== DATA LOADING ORCHESTRATION =====
    
    async detectObjectTypeAndLoadData() {
        this.debugLog('detectObjectTypeAndLoadData called with recordId:', this.currentRecordId);
        
        // If we have a SOQL query that doesn't use $recordId, skip recordId validation
        if (this.useCustomQuery && this.soqlQuery && !this.soqlQuery.includes('$recordId')) {
            this.debugLog('SOQL query does not use $recordId, proceeding without record context');
            this.loadData();
            return;
        }
        
        if (!this.currentRecordId) {
            this.debugLog('No valid record ID for processing');
            this.clearData();
            return;
        }
        
        try {
            // Always detect object type (needed for both modes)
            this.detectedObjectType = await getObjectTypeFromRecordId({ recordId: this.currentRecordId });
            this.debugLog('Detected object type:', this.detectedObjectType);
            
            if (this.detectedObjectType) {
                // Force a signature update to trigger reload
                this.lastDataSignature = '';
                this.loadData();
            } else {
                this.error = 'Could not determine object type from record ID';
            }
        } catch (error) {
            this.logError('Error detecting object type:', error);
            this.error = 'Could not determine object type from record ID';
        }
    }
    
    async loadData() {
        // Debug configuration first
        this.debugConfiguration();

        if (!this.hasValidConfiguration) {
            this.debugLog(`Invalid configuration, skipping data load`);
            this.clearData();
            return;
        }

        const startTime = performance.now();
        this.debugLog(`Loading data for type: ${this.relatedListType}`);

        this.isLoading = true;
        this.error = null;

        try {
            // Route to appropriate data loading method based on type
            if (this.isArticlesType) {
                await this.loadArticles();
            } else if (this.isFilesType) {
                await this.loadFiles();
            } else if (this.useCustomQuery) {
                await this.loadDataWithSOQL();
            } else {
                await this.loadDataWithARL();
            }

            // Update signatures to prevent unnecessary reloads
            this.lastDataSignature = this.dataSignature;
            this.lastUISignature = this.uiSignature;

            const endTime = performance.now();
            this.lastLoadTime = Math.round(endTime - startTime);
            this.debugLog(`Data loading took ${this.lastLoadTime}ms`);

        } catch (error) {
            this.logError(`Error loading data:`, error);
            this.error = error.body?.message || error.message || 'Unknown error occurred';
            this.clearData();
        } finally {
            this.isLoading = false;
        }
    }
    
    // Fast column rebuild for UI-only changes (no data reload)
    async rebuildColumnsOnly() {
        this.debugLog('Rebuilding columns only (no data reload)');
        
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
                this.debugLog('ARL column rebuild requires data reload');
                this.loadData();
                return;
            }
            
            // Reprocess records for new linking configuration
            this.allRecords = this.reprocessRecordsForLinking(this.allRecords);
            this.updateDisplayedRecords();
            
            // Update UI signature
            this.lastUISignature = this.uiSignature;
            
        } catch (error) {
            this.logError('Error rebuilding columns:', error);
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
        this.debugLog('Using Related List API data loading method');
        
        if (!this.relatedListName || !this.detectedObjectType) {
            throw new Error('Related List Name and Object Type are required for ARL mode');
        }
        
        this.debugLog('ARL Parameters:', {
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
        
        this.debugLog('ARL Response:', response);
        
        if (response?.fields) {
            this.columns = this.buildColumnsFromARL(response.fields);
            this.allRecords = this.processARLRecords(response.records || []);
            this.currentOffset = 0;
            this.updateDisplayedRecords();
            this.hasData = this.allRecords.length > 0;
            
            this.debugLog(`ARL Success: ${this.columns.length} columns, ${this.allRecords.length} records`);
        } else {
            throw new Error('No field information returned from Related List API');
        }
    }
    
    buildColumnsFromARL(fields) {
        return fields.map((field, index) => {
            const fieldType = this.mapFieldTypeToDataTableType(field.type);
            const column = {
                label: this.getCustomFieldLabel(field, index),
                fieldName: this.getDisplayFieldNameForARL(field.apiName),
                type: (field.type === 'DATETIME' || field.type === 'DATE') ? 'text' : fieldType,
                isDateTime: field.type === 'DATETIME',
                isDate: field.type === 'DATE',
                sortable: !this.columnSortingDisabled,
                wrapText: true
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
            
            // Format datetime and date fields
            this.columns.forEach(col => {
                const fieldName = col.fieldName === 'recordUrl' ? 
                    (col.typeAttributes?.label?.fieldName || this.columns[0].fieldName) : 
                    col.fieldName;
                    
                if (col.isDateTime && processedRecord[fieldName]) {
                    processedRecord[fieldName] = this.formatDateTime(processedRecord[fieldName]);
                } else if (col.isDate && processedRecord[fieldName]) {
                    processedRecord[fieldName] = this.formatDate(processedRecord[fieldName]);
                }
            });

            // Add record URL for linking
            if (this.enableRecordLinking && this.recordPageUrl && record.Id) {
                processedRecord.recordUrl = this.buildRecordUrl(record.Id);
            }
            
            // Flatten relationship fields for ARL mode
            this.flattenRelationshipFieldsForARL(processedRecord, records.length > 0 ? records[0] : {});
            
            // Add card display data
            processedRecord.cardData = this.buildCardData(processedRecord);
            
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
                    this.debugLog(`Flattened ARL field ${key} -> ${flattenedFieldName}: ${record[flattenedFieldName]}`);
                } else {
                    record[flattenedFieldName] = null;
                    this.debugLog(`Flattened ARL field ${key} -> ${flattenedFieldName}: null (no data)`);
                }
            }
        });
    }

    // ===== SOQL MODE DATA LOADING =====
    
    async loadDataWithSOQL() {
        this.debugLog('Using SOQL data loading method');
        this.debugLog('SOQL Query:', this.soqlQuery);
        this.debugLog('Display Fields:', this.displayFields);
        
        const [fieldInfos, queryResult] = await Promise.all([
            this.getFieldInfos(),
            this.executeQuery()
        ]);
        
        this.debugLog('Field Infos received:', fieldInfos);
        this.debugLog('Query Result received:', queryResult);
        
        this.columns = this.buildColumnsFromSOQL(fieldInfos);
        this.allRecords = this.flattenRecords(queryResult.records || []);
        this.currentOffset = 0;
        this.updateDisplayedRecords();
        
        this.debugLog('SOQL data loading completed');
        this.debugLog('Columns:', this.columns);
        this.debugLog('Records:', this.allRecords);
    }
    
    // Enhanced getFieldInfos with better error handling and field parsing
    async getFieldInfos() {
        // If displayFields is empty, parse it from the query
        let fieldsToUse = this.displayFields;
        
        if (!fieldsToUse || fieldsToUse.trim() === '') {
            this.debugLog('displayFields is empty, parsing from SOQL query');
            fieldsToUse = this.parseFieldsFromQuery(this.soqlQuery);
        }
        
        if (!fieldsToUse || fieldsToUse.trim() === '') {
            this.debugWarn('No fields available for processing');
            return [];
        }
        
        const objectName = this.extractObjectNameFromQuery(this.soqlQuery);
        if (!objectName) {
            throw new Error('Could not determine object type from SOQL query');
        }
        
        this.debugLog('Getting field info for object:', objectName, 'fields:', fieldsToUse);
        
        return await getFieldInfo({ 
            objectApiName: objectName, 
            fieldList: fieldsToUse 
        });
    }
    
    // Parse fields from SOQL query as backup
    parseFieldsFromQuery(query) {
        try {
            if (!query || query.trim() === '') {
                return '';
            }
            
            const normalizedQuery = query.replace(/\s+/g, ' ').trim();
            const selectMatch = normalizedQuery.match(/SELECT\s+(.*?)\s+FROM/i);
            
            if (!selectMatch) {
                this.debugWarn('Could not parse SELECT fields from query');
                return '';
            }
            
            const fieldsString = selectMatch[1];
            // Clean up the fields and return as comma-separated string
            const fields = fieldsString.split(',').map(field => field.trim()).filter(field => field);
            
            this.debugLog('Parsed fields from query:', fields);
            return fields.join(', ');
        } catch (error) {
            this.logError('Error parsing fields from query:', error);
            return '';
        }
    }
    
    async executeQuery() {
        this.debugLog('Executing SOQL query:', this.soqlQuery);
        
        const result = await executeQuery({ 
            soqlQuery: this.soqlQuery, 
            recordId: this.currentRecordId
        });
        
        this.debugLog('Query execution result:', result);
        
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
            this.logError('Error extracting object name:', error);
            return null;
        }
    }
    
    buildColumnsFromSOQL(fieldInfos) {
        this.debugLog('Building columns from field infos:', fieldInfos);
        
        return fieldInfos.map((fieldInfo, index) => {
            const fieldType = this.mapFieldTypeToDataTableType(fieldInfo.type);
            const column = {
                label: this.getCustomFieldLabel(fieldInfo, index),
                fieldName: fieldInfo.apiName,
                type: (fieldInfo.type === 'DATETIME' || fieldInfo.type === 'DATE') ? 'text' : fieldType,
                isDateTime: fieldInfo.type === 'DATETIME',
                isDate: fieldInfo.type === 'DATE',
                sortable: !this.columnSortingDisabled,
                wrapText: true
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
            }
            
            this.debugLog('Created column:', column);
            
            return column;
        });
    }
        
    flattenRecords(records) {
        this.debugLog('Flattening records:', records);
        
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
            
            // Format datetime and date fields
            this.columns.forEach(col => {
                if (col.isDateTime && flatRecord[col.fieldName]) {
                    flatRecord[col.fieldName] = this.formatDateTime(flatRecord[col.fieldName]);
                } else if (col.isDate && flatRecord[col.fieldName]) {
                    flatRecord[col.fieldName] = this.formatDate(flatRecord[col.fieldName]);
                }
            });
            
            // Add record URL for linking
            if (this.enableRecordLinking && this.recordPageUrl && record.Id) {
                flatRecord.recordUrl = this.buildRecordUrl(record.Id);
            }
            
            // Add card display data
            flatRecord.cardData = this.buildCardData(flatRecord);
            
            return flatRecord;
        });
    }
    
    buildCardData(record) {
        if (!this.columns || this.columns.length === 0) {
            return { title: '', fields: [] };
        }
        
        // Get first field value for title
        const firstCol = this.columns[0];
        let titleFieldName = firstCol.fieldName;
        if (titleFieldName === 'recordUrl' && firstCol.typeAttributes?.label?.fieldName) {
            titleFieldName = firstCol.typeAttributes.label.fieldName;
        }
        
        const cardData = {
            title: record[titleFieldName] || '',
            fields: []
        };
        
        // Get remaining fields with their values
        for (let i = 1; i < this.columns.length; i++) {
            const col = this.columns[i];
            let fieldName = col.fieldName;
            if (fieldName === 'recordUrl' && col.typeAttributes?.label?.fieldName) {
                fieldName = col.typeAttributes.label.fieldName;
            }
            
            cardData.fields.push({
                key: `field-${i}`,
                label: col.label,
                value: record[fieldName] || ''
            });
        }
        
        return cardData;
    }

    async loadArticles() {
        this.debugLog('Loading Knowledge Articles for case:', this.currentRecordId);
        
        if (!this.currentRecordId) {
            throw new Error('Record ID is required for Knowledge Articles');
        }
        
        try {
            const articles = await getCaseArticles({ caseId: this.currentRecordId });
            
            this.debugLog(`Retrieved ${articles.length} articles`);
            
            // Build columns for articles - single "Title" column
            this.columns = [{
                label: 'Title',
                fieldName: this.enableRecordLinking && this.recordPageUrl ? 'recordUrl' : 'title',
                type: this.enableRecordLinking && this.recordPageUrl ? 'url' : 'text',
                typeAttributes: this.enableRecordLinking && this.recordPageUrl ? {
                    label: { fieldName: 'title' },
                    target: '_blank'
                } : undefined,
                sortable: !this.columnSortingDisabled,
                wrapText: true
            }];
            
            // Transform articles to match the datatable structure
            this.allRecords = articles.map(article => ({
                Id: article.id,
                title: article.title,
                urlName: article.urlName,
                recordUrl: this.enableRecordLinking && this.recordPageUrl ? 
                    this.buildArticleUrl(article.urlName, article.id) : undefined
            }));
            
            // Reset pagination
            this.currentOffset = 0;
            this.updateDisplayedRecords();
            
            this.debugLog(`Loaded ${this.allRecords.length} articles, displaying ${this.displayedRecords.length}`);
            
        } catch (error) {
            this.logError('Error loading articles:', error);
            throw error;
        }
    }

    async loadFiles() {
        this.debugLog('Loading Files for record:', this.currentRecordId);
        
        if (!this.currentRecordId) {
            throw new Error('Record ID is required for Files');
        }
        
        try {
            const files = await getFiles({
                recordId: this.currentRecordId,
                sortField: 'CreatedDate',
                sortDirection: 'DESC',
                limitCount: 50
            });
            
            this.debugLog(`Retrieved ${files.length} files`);
            
            // Build columns for table view
            this.columns = [
                {
                    label: 'Name',
                    fieldName: 'title',
                    type: 'button',
                    typeAttributes: {
                        label: { fieldName: 'title' },
                        name: 'viewFile',
                        variant: 'base'
                    },
                    sortable: !this.columnSortingDisabled,
                    wrapText: true
                },
                {
                    label: 'Type',
                    fieldName: 'fileExtension',
                    type: 'text',
                    fixedWidth: 80,
                    sortable: !this.columnSortingDisabled
                },
                {
                    label: 'Size',
                    fieldName: 'formattedSize',
                    type: 'text',
                    fixedWidth: 100,
                    sortable: !this.columnSortingDisabled
                },
                {
                    label: 'Modified',
                    fieldName: 'createdDate',
                    type: 'date',
                    typeAttributes: {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    },
                    fixedWidth: 180,
                    sortable: !this.columnSortingDisabled
                }
            ];
            
            // Store files directly
            this.allRecords = files || [];
            
            // Reset pagination
            this.currentOffset = 0;
            this.updateDisplayedRecords();
            
            this.debugLog(`Loaded ${this.allRecords.length} files, displaying ${this.displayedRecords.length}`);
            
        } catch (error) {
            this.logError('Error loading files:', error);
            throw error;
        }
    }

    buildArticleUrl(urlName, articleId) {
        // If recordPageUrl is NOT configured, return null (no linking)
        if (!this.recordPageUrl || this.recordPageUrl.trim() === '') {
            this.debugLog('No recordPageUrl configured - articles will not link');
            return null;
        }
        
        const siteBaseUrl = this.getSiteBaseUrl();
        let articlePath = this.recordPageUrl;
        
        // Replace placeholders
        if (articlePath.includes(':urlName')) {
            articlePath = articlePath.replace(':urlName', urlName);
        } else if (articlePath.includes('{urlName}')) {
            articlePath = articlePath.replace('{urlName}', urlName);
        }
        
        if (articlePath.includes(':recordId')) {
            articlePath = articlePath.replace(':recordId', articleId);
        } else if (articlePath.includes('{recordId}')) {
            articlePath = articlePath.replace('{recordId}', articleId);
        }
        
        // Ensure path starts with /
        const cleanPath = articlePath.startsWith('/') ? articlePath : '/' + articlePath;
        const fullUrl = siteBaseUrl + cleanPath;
        
        this.debugLog('Built article URL from recordPageUrl:', fullUrl);
        return fullUrl;
    }

    getSiteBaseUrl() {
        const url = new URL(window.location.href);
        
        this.debugLog('Getting site base URL from:', window.location.href);
        
        // For Experience Cloud sites, capture the full site path
        if (url.hostname.includes('.my.site.com') || 
            url.hostname.includes('.force.com') ||
            url.hostname.includes('salesforce-experience.com')) {
            
            const pathParts = url.pathname.split('/').filter(part => part !== '');
            
            if (pathParts.length > 0) {
                const sitePath = pathParts[0];
                return `${url.origin}/${sitePath}`;
            }
            
            return url.origin;
        } else {
            // Custom domain
            const pathParts = url.pathname.split('/').filter(part => part !== '');
            if (pathParts.length > 0) {
                return `${url.origin}/${pathParts[0]}`;
            }
            
            return url.origin;
        }
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
        
        this.debugLog(`Showing ${this.displayedRecords.length} of ${this.allRecords.length} records`);
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
            'NUMBER': 'text',
            'DOUBLE': 'number',
            'INTEGER': 'number',
            'DATE': 'text',
            'DATETIME': 'text',
            'TIME': 'text',
            'BOOLEAN': 'boolean',
            'PICKLIST': 'text',
            'MULTIPICKLIST': 'text',
            'REFERENCE': 'text'
        };
        
        return typeMap[fieldType?.toUpperCase()] || 'text';
    }

    formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            // Format as M/D/YYYY
            return date.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '';
        
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return dateTimeString;
        }
    }
    
    // ===== EVENT HANDLERS =====
    
    handleRefresh() {
        this.debugLog(`Refresh clicked - Mode: ${this.dataSourceMode}`);

        // Log performance metrics before refresh
        this.logPerformanceMetrics('BEFORE REFRESH');

        // Set a flag to prevent renderedCallback from interfering
        this.isRefreshing = true;

        this.clearData();

        // Force reload by resetting signatures
        this.lastDataSignature = '';
        this.lastUISignature = '';

        // Reset metrics for this refresh cycle
        this._perfMetrics.configObjAccessCount = 0;
        this._perfMetrics.dataSignatureAccessCount = 0;
        this._perfMetrics.uiSignatureAccessCount = 0;

        // Invalidate signature caches to force fresh comparison
        this._cachedDataSignature = null;
        this._cachedUiSignature = null;

        this.loadData().finally(() => {
            this.isRefreshing = false;
            // Log performance metrics after refresh completes
            setTimeout(() => {
                this.logPerformanceMetrics('AFTER REFRESH');
            }, 100);
        });
    }

    logPerformanceMetrics(label) {
        console.log(`\n========== PERFORMANCE METRICS ${label} ==========`);
        console.log(`✓ FIX #1 APPLIED: Cached configObj (JSON.parse only on change)`);
        console.log(`✓ FIX #2 APPLIED: Removed @track from 14 primitives`);
        console.log(`✓ FIX #3 APPLIED: Cached dataSignature & uiSignature (JSON.stringify only on change)`);
        console.log(`✓ FIX #6 APPLIED: Cached relatedListLabel`);
        console.log(`✓ FIX #7 APPLIED: Cached customFieldNamesList`);
        console.log(`✓ FIX #8 APPLIED: Optimized sorting algorithm (pre-extract values)`);
        console.log(`configObj accesses: ${this._perfMetrics.configObjAccessCount}`);
        console.log(`dataSignature accesses: ${this._perfMetrics.dataSignatureAccessCount}`);
        console.log(`uiSignature accesses: ${this._perfMetrics.uiSignatureAccessCount}`);
        console.log(`renderedCallback calls: ${this._perfMetrics.renderCallbackCount}`);
        console.log(`Last render time: ${this._perfMetrics.lastRenderTime.toFixed(2)}ms`);
        console.log(`@track properties: 3 (was 17) - Only arrays: allRecords, displayedRecords, columns`);
        console.log(`================================================\n`);
    }
    
    handleViewMore() {
        this.debugLog('View More clicked');
        this.isLoadingMore = true;
        
        try {
            this.currentOffset += this.initialRecordsToLoad;
            this.updateDisplayedRecords();
        } catch (error) {
            this.logError('Error loading more records:', error);
        } finally {
            this.isLoadingMore = false;
        }
    }
    
    handleViewAll() {
        this.debugLog('View All clicked');
        
        // If viewAllUrl is configured, navigate to it
        if (this.viewAllUrl && this.viewAllUrl.trim() !== '') {
            this.debugLog('Navigating to View All URL:', this.viewAllUrl);
            this.navigateToViewAllUrl();
        } else {
            // Fall back to showing all records in current table
            this.debugLog('No View All URL configured, showing all records in table');
            if (this.allRecords.length > 0) {
                this.displayedRecords = [...this.allRecords];
                this.hasMoreRecords = false;
                this.debugLog('Showing all', this.displayedRecords.length, 'records');
            }
        }
    }

    handleSort(event) {
        try {
            const { fieldName: sortedBy, sortDirection } = event.detail;
            this.debugLog('Column sort requested:', sortedBy, sortDirection);
            
            this.sortedBy = sortedBy;
            this.sortDirection = sortDirection;
            
            // Sort the allRecords array
            this.sortData(sortedBy, sortDirection);
            
            // Reset pagination and update displayed records
            this.currentOffset = 0;
            this.updateDisplayedRecords();
            
        } catch (error) {
            this.logError('Error handling sort:', error);
        }
    }

    sortData(fieldName, direction) {
        try {
            this.debugLog('Sorting data by field:', fieldName, 'direction:', direction);

            // Fix #8: Pre-extract and normalize values ONCE instead of on every comparison
            const sortableRecords = this.allRecords.map((record, index) => {
                let rawValue = this.getFieldValue(record, fieldName);

                // Normalize value once (not on every comparison)
                let sortValue;
                if (rawValue == null) {
                    sortValue = null;
                } else if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
                    sortValue = String(rawValue);
                } else {
                    sortValue = rawValue;
                }

                return {
                    record,
                    sortValue,
                    originalIndex: index
                };
            });

            // Sort using pre-extracted values (much faster - no function calls in comparator)
            sortableRecords.sort((a, b) => {
                // Handle null/undefined values
                if (a.sortValue == null && b.sortValue == null) return 0;
                if (a.sortValue == null) return direction === 'asc' ? -1 : 1;
                if (b.sortValue == null) return direction === 'asc' ? 1 : -1;

                // Simple comparison
                let result = 0;
                if (a.sortValue < b.sortValue) {
                    result = -1;
                } else if (a.sortValue > b.sortValue) {
                    result = 1;
                }

                return direction === 'asc' ? result : -result;
            });

            // Extract sorted records
            this.allRecords = sortableRecords.map(item => item.record);
            this.debugLog('Data sorted successfully');

        } catch (error) {
            this.logError('Error sorting data:', error);
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
            this.logError('Error getting field value:', error);
            return null;
        }
    }
    
    clearSort() {
        this.sortedBy = '';
        this.sortDirection = 'asc';
    }

    handleLoadMore(event) {
        try {
            this.debugLog('Load more triggered');
            
            if (this.isLoadingMore || !this.hasMoreRecords) {
                return;
            }
            
            this.isLoadingMore = true;
            
            this.currentOffset += this.initialRecordsToLoad;
            this.updateDisplayedRecords();
            
            setTimeout(() => {
                this.isLoadingMore = false;
            }, 300);
            
        } catch (error) {
            this.logError('Error in load more:', error);
            this.isLoadingMore = false;
        }
    }

    navigateToViewAllUrl() {
        const siteBaseUrl = this.getSiteBaseUrl();
        const cleanUrl = this.viewAllUrl.startsWith('/') ? this.viewAllUrl : '/' + this.viewAllUrl;
        const fullUrl = siteBaseUrl + cleanUrl;
        
        this.debugLog('View All URL:', fullUrl);
        
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: fullUrl
            }
        });
    }
    
    handleFileClick(event) {
        event.preventDefault();
        const target = event.currentTarget;
        const fileName = target.dataset.name;
        const fileSize = target.dataset.size;
        const contentDocumentId = target.dataset.id;
        const isImage = target.dataset.isImage === 'true';
        const downloadUrl = target.dataset.downloadUrl;
        
        this.debugLog('File clicked:', { fileName, isImage, contentDocumentId });
        
        if (isImage) {
            this.handleImagePreview(contentDocumentId, fileName, fileSize, downloadUrl);
        } else {
            this.handleDirectDownload(downloadUrl, fileName);
        }
    }

    async handleImagePreview(contentDocumentId, fileName, fileSize, downloadUrl) {
        this.modalImageName = fileName;
        this.modalImageSize = fileSize;
        this.modalImageLoadError = '';
        this.modalImageUrl = '';
        this.modalDownloadUrl = downloadUrl;
        this.isLoadingModalImage = true;
        this.showImageModal = true;
        
        try {
            const base64Url = await getImageAsBase64({ contentDocumentId });
            
            if (base64Url) {
                this.modalImageUrl = base64Url;
                this.isLoadingModalImage = false;
                this.debugLog('Image loaded successfully');
            } else {
                throw new Error('No image data returned');
            }
        } catch (error) {
            this.logError('Error loading image:', error);
            this.modalImageLoadError = 'Failed to load image: ' + (error.body?.message || error.message);
            this.isLoadingModalImage = false;
        }
    }

    handleDirectDownload(downloadUrl, fileName) {
        if (!downloadUrl) {
            this.logError('No download URL available for file:', fileName);
            return;
        }
        
        this.debugLog('Initiating download:', fileName);
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'download';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    handleCloseModal() {
        this.showImageModal = false;
        this.isLoadingModalImage = false;
        this.modalImageUrl = '';
        this.modalDownloadUrl = '';
        this.modalImageName = '';
        this.modalImageSize = '';
        this.modalImageLoadError = '';
    }

    handleModalBackdropClick(event) {
        if (event.target.classList.contains('slds-backdrop')) {
            this.handleCloseModal();
        }
    }

    handleDownloadFromModal() {
        if (this.modalDownloadUrl) {
            this.handleDirectDownload(this.modalDownloadUrl, this.modalImageName);
        }
    }

    handleModalImageError(event) {
        const img = event.target;
        const failedUrl = img.src;
        
        this.modalImageLoadError = `Failed to load image: ${failedUrl}`;
        
        // Try fallback to download URL if different
        if (failedUrl === this.modalImageUrl && this.modalDownloadUrl && failedUrl !== this.modalDownloadUrl) {
            this.modalImageUrl = this.modalDownloadUrl;
        }
    }

    handleModalImageLoad() {
        this.modalImageLoadError = '';
    }
}