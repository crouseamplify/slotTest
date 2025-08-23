import { LightningElement, track, api } from 'lwc';

const defaultCSSClasses = 'slds-m-bottom_medium';

export default class SlotTestCpe extends LightningElement {

    @track showSqlModal = false;
    @track availableFields = [];
    @track selectedFields = [];
    @track fieldsInitialized = false;
    lastInitializedQuery = '';

    @track propInputs = {
        recordId: {
            key: 'recordId',
            label: 'Record ID',
            type: 'text',
            help: 'Record ID for context. Use {!recordId} for current record or provide a specific Salesforce record ID.',
            required: false,
            valuePath: 'recordId',
            value: '{!recordId}',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        // ===== UI CONFIGURATION =====
        numberOfSlots: {
            key: 'numberOfSlots',
            label: 'Number of Action Slots',
            type: 'select',
            help: 'How many slots do you need in the component header?',
            required: false,
            valuePath: 'numberOfSlots',
            value: 'None',
            doSetDefaultValue: true,
            classes: defaultCSSClasses,
            options: [
                { label: 'None', value: 'None' },
                { label: 'One', value: 'One' },
                { label: 'Two', value: 'Two' },
                { label: 'Three', value: 'Three' },
                { label: 'Four', value: 'Four' }
            ]
        },
        relatedListIcon: {
            key: 'relatedListIcon',
            label: 'Related List Icon',
            type: 'text',
            help: 'SLDS icon name for the related list (e.g., \'standard:contact\', \'utility:activity\'). Leave blank for no icon.',
            required: false,
            valuePath: 'relatedListIcon',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        relatedListLabel: {
            key: 'relatedListLabel',
            label: 'Related List Label',
            type: 'text',
            help: 'Display name for the related list header (e.g., \'My Assignments\', \'Open Cases\'). This appears in the component header.',
            required: false,
            valuePath: 'relatedListLabel',
            value: 'Related Records',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        showViewMore: {
            key: 'showViewMore',
            label: 'Show View More Button',
            type: 'checkbox',
            help: 'Shows a \'Load More\' button for progressive loading.',
            required: false,
            valuePath: 'showViewMore',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        showViewAll: {
            key: 'showViewAll',
            label: 'Show View All Button',
            type: 'checkbox',
            help: 'Shows a \'View All\' button to expand all records.',
            required: false,
            valuePath: 'showViewAll',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        viewAllUrl: {
            key: 'viewAllUrl',
            label: 'View All URL',
            type: 'text',
            help: 'URL path for the View All button to navigate to list view (e.g., \'/case/Case/My_Cases\'). Will be appended to the site base URL.',
            required: false,
            valuePath: 'viewAllUrl',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },

        // ===== DATA SOURCE TOGGLE =====
        useCustomQuery: {
            key: 'useCustomQuery',
            label: 'Data Source Mode',
            type: 'toggle',
            help: 'Choose your data source: Related List API (fast, automatic) or Custom SOQL (flexible, advanced)',
            required: false,
            valuePath: 'useCustomQuery',
            value: false, // Default to ARL mode
            doSetDefaultValue: true,
            classes: defaultCSSClasses,
            options: [
                { label: 'Related List API', value: false },
                { label: 'Custom SOQL', value: true }
            ]
        },

        // ===== RELATED LIST API PROPERTIES =====
        relatedListName: {
            key: 'relatedListName',
            label: 'Related List Name',
            type: 'text',
            help: 'The API name of the related list (e.g., \'Contacts\', \'Opportunities\', \'Cases\'). Used in Related List API mode.',
            required: false,
            valuePath: 'relatedListName',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        relationshipField: {
            key: 'relationshipField',
            label: 'Relationship Field (Optional)',
            type: 'text',
            help: 'Specific lookup field when multiple relationships exist (e.g., \'AccountId\'). Leave blank for auto-detection.',
            required: false,
            valuePath: 'relationshipField',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        enabledFields: {
            key: 'enabledFields',
            label: 'Enabled Fields (Optional)',
            type: 'text',
            help: 'Comma-separated field names to display (e.g., \'Name,Email,Phone\'). Leave blank for default fields.',
            required: false,
            valuePath: 'enabledFields',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        fieldNames: {
            key: 'fieldNames',
            label: 'Field Names (Custom Headers)',
            type: 'text',
            help: 'Comma-separated custom column headers (e.g., "Asset Name,Product,Status"). Maps 1:1 with Enabled Fields. Leave blank to use default field labels.',
            required: false,
            valuePath: 'fieldNames',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },

        // ===== SOQL PROPERTIES =====
        soqlQuery: { 
            key: 'soqlQuery',
            label: 'SOQL Query',
            buttonLabel: 'Set Query',
            type: 'modal',
            help: 'Custom SOQL query with field parsing and selection tools. Used in Custom SOQL mode.',
            required: false,
            valuePath: 'soqlQuery',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses + ' customTextArea slds-grid slds-size_1-of-1'
        },
        displayFields: {
            key: 'displayFields',
            label: 'Display Fields',
            type: 'text',
            help: 'Comma-separated list of fields to display. Order determines column order. Auto-populated from SOQL query parsing.',
            required: false,
            valuePath: 'displayFields',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },

        // ===== RECORD LINKING =====
        recordPageUrl: {
            key: 'recordPageUrl',
            label: 'Record Detail Page URL',
            type: 'text',
            help: 'URL pattern for record detail pages. Use :recordId as placeholder (e.g., /contact/:recordId). Leave blank to disable linking.',
            required: false,
            valuePath: 'recordPageUrl',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        enableRecordLinking: {
            key: 'enableRecordLinking',
            label: 'Enable First Column Linking',
            type: 'checkbox',
            help: 'Make the first column clickable to navigate to the record detail page. Requires Record Page URL Pattern to be set.',
            required: false,
            valuePath: 'enableRecordLinking',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },

        // ===== TABLE CONFIGURATION =====
        initialRecordsToLoad: {
            key: 'initialRecordsToLoad',
            label: 'Initial Records to Load',
            type: 'number',
            help: 'Number of records to load initially. Additional records can be loaded with the "Load More" button.',
            required: false,
            valuePath: 'initialRecordsToLoad',
            value: 6,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        defaultColumnWidth: {
            key: 'defaultColumnWidth',
            label: 'Default Column Width',
            type: 'number',
            help: 'Set a fixed width (in pixels) for all columns. Leave blank for automatic sizing. Recommended range: 80-400 pixels.',
            required: false,
            valuePath: 'defaultColumnWidth',
            value: '',
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        showRowNumberColumn: {
            key: 'showRowNumberColumn',
            label: 'Show Row Number Column',
            type: 'checkbox',
            help: 'Show row numbers in the data table',
            required: false,
            valuePath: 'showRowNumberColumn',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        resizeColumnDisabled: {
            key: 'resizeColumnDisabled',
            label: 'Resize Column Disabled',
            type: 'checkbox',
            help: 'Disable column resizing in the data table',
            required: false,
            valuePath: 'resizeColumnDisabled',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        columnSortingDisabled: {
            key: 'columnSortingDisabled',
            label: 'Column Sorting Disabled',
            type: 'checkbox',
            help: 'Disable column sorting in the data table',
            required: false,
            valuePath: 'columnSortingDisabled',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        },
        enableInfiniteLoading: {
            key: 'enableInfiniteLoading',
            label: 'Enable Infinite Loading',
            type: 'checkbox',
            help: 'Enable infinite scrolling to automatically load more records as user scrolls to bottom. This disables the View More button.',
            required: false,
            valuePath: 'enableInfiniteLoading',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        }, 
        fixedTableHeader: {
            key: 'fixedTableHeader',
            label: 'Fixed Table Header',
            type: 'checkbox',
            help: 'Keep table header visible while scrolling through data.',
            required: false,
            valuePath: 'fixedTableHeader',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        }
    };

    // ===== COMPUTED GETTERS =====
    
    get recordIdPlaceholder() {
        return this.propInputs.recordId.value === '{!recordId}' || !this.propInputs.recordId.value ? 
               'e.g., 0031234567890ABC or {!recordId}' : '';
    }

    @api
    get value() {
        return this._value || '{}';
    }

    set value(value) {
        if (!value || value.trim() === '') {
            value = '{}';
        }

        if (this._value === value) {
            return;
        }

        let valuetmp;
        try {
            valuetmp = JSON.parse(value);
        } catch (e) {
            console.error('Invalid JSON in CPE value:', value);
            valuetmp = {};
        }

        let hasValueChanged = false;

        for (let key in this.propInputs) {
            if (this.objectHasProperty(this.propInputs, key) && this.propInputs[key].doSetDefaultValue === true) {
                let tmpVal = this.getObjPropValue(valuetmp, this.propInputs[key].valuePath);
                if (this.isObjectEmpty(tmpVal)) {
                    tmpVal = this.propInputs[key].value;
                    if (((this.propInputs[key].type === 'text' || this.propInputs[key].type === 'select') 
                        && !this.isStringEmpty(tmpVal)) 
                        ||
                        ((this.propInputs[key].type === 'checkbox' || this.propInputs[key].type === 'number') 
                        && !this.isObjectEmpty(tmpVal))) {
                        valuetmp = this.setObjPropValue(valuetmp, this.propInputs[key].valuePath, tmpVal);
                        value = JSON.stringify(valuetmp);
                        hasValueChanged = true;
                    }
                }
                
                if (this.propInputs[key].value !== tmpVal) {
                    this.propInputs[key].value = tmpVal;
                    
                    // Update button labels for modal fields
                    if (key === 'soqlQuery') {
                        if (!this.isStringEmpty(this.propInputs[key].value)) {
                            this.propInputs[key].buttonLabel = 'Edit Query';
                        }
                    }
                }
            }
        }

        // Initialize dual listbox for SOQL mode
        if (!this.fieldsInitialized || !valuetmp.soqlQuery || valuetmp.soqlQuery !== this.lastInitializedQuery) {
            this.initializeDualListbox(valuetmp);
            this.lastInitializedQuery = valuetmp.soqlQuery;
        } else {
            const displayFields = valuetmp.displayFields || '';
            this.selectedFields = displayFields ? displayFields.split(',').map(f => f.trim()).filter(f => f) : [];
        }

        this._value = value;
        
        if (hasValueChanged === true) {
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: value}}));
        }
    }

    // ===== COMPUTED PROPERTIES =====

    get modalClass() {
        return 'slds-modal slds-modal_large slds-fade-in-open';
    }

    get displayBackdrop() {
        return this.showSqlModal;
    }

    get hasAvailableFields() {
        return this.fieldsInitialized && this.availableFields && this.availableFields.length > 0;
    }

    get showRelatedListSection() {
        return !this.propInputs.useCustomQuery.value;
    }

    get showSOQLSection() {
        return this.propInputs.useCustomQuery.value;
    }

    // ===== INITIALIZATION =====

    initializeDualListbox(config) {
        const soqlQuery = config.soqlQuery || '';
        const displayFields = config.displayFields || '';
        
        this.availableFields = this.parseFieldsFromSoql(soqlQuery);
        this.selectedFields = displayFields ? displayFields.split(',').map(f => f.trim()).filter(f => f) : [];
        
        this.fieldsInitialized = this.availableFields.length > 0;
    }

   parseFieldsFromSoql(soqlQuery) {
        console.log('Parsing SOQL:', soqlQuery);
        if (!soqlQuery) {
            console.log('No SOQL query provided');
            return [];
        }
        
        try {
            const normalizedQuery = soqlQuery.replace(/\s+/g, ' ').trim();
            console.log('Normalized query:', normalizedQuery);
            
            const selectMatch = normalizedQuery.match(/SELECT\s+(.*?)\s+FROM/i);
            console.log('Select match:', selectMatch);
            
            if (!selectMatch) {
                console.log('No SELECT match found');
                return [];
            }
            
            const fieldsString = selectMatch[1];
            console.log('Fields string:', fieldsString);
            
            const fields = fieldsString.split(',').map(field => {
                const cleanField = field.trim();
                console.log('Processing field:', cleanField);
                return {
                    label: cleanField,
                    value: cleanField
                };
            });
            
            console.log('Parsed fields:', fields);
            return fields;
        } catch (e) {
            console.error('Error parsing SOQL:', e);
            return [];
        }
    }

    // ===== EVENT HANDLERS =====

    handleRecordIdChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.recordId.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.recordId.value !== newValue) {
                this.propInputs.recordId.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.recordId = this.propInputs.recordId.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleRecordIdChange:', error);
        }
    }

    // UI Configuration handlers
    handleNumberOfSlotsChange(e) {
        try {
            const newValue = this.getEventValue(e);
            console.log('Number of slots change handler called with:', newValue);
            this.propInputs.numberOfSlots.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.numberOfSlots = this.propInputs.numberOfSlots.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleNumberOfSlotsChange:', error);
        }
    }

    handleRelatedListIconChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.relatedListIcon.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.relatedListIcon.value !== newValue) {
                this.propInputs.relatedListIcon.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.relatedListIcon = this.propInputs.relatedListIcon.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleRelatedListIconChange:', error);
        }
    }

    handleRelatedListLabelChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.relatedListLabel.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.relatedListLabel.value !== newValue) {
                this.propInputs.relatedListLabel.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.relatedListLabel = this.propInputs.relatedListLabel.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleRelatedListLabelChange:', error);
        }
    }

    handleShowViewMoreChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.showViewMore.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.showViewMore = this.propInputs.showViewMore.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleShowViewMoreChange:', error);
        }
    }

    handleShowViewAllChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.showViewAll.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.showViewAll = this.propInputs.showViewAll.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleShowViewAllChange:', error);
        }
    }

    handleViewAllUrlChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.viewAllUrl.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.viewAllUrl.value !== newValue) {
                this.propInputs.viewAllUrl.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.viewAllUrl = this.propInputs.viewAllUrl.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleViewAllUrlChange:', error);
        }
    }

    // Data Source Mode Toggle
    handleUseCustomQueryChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            console.log('Data source mode changed to:', newValue ? 'Custom SOQL' : 'Related List API');
            
            this.propInputs.useCustomQuery.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.useCustomQuery = this.propInputs.useCustomQuery.value;
            
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleUseCustomQueryChange:', error);
        }
    }

    // Related List API handlers
    handleRelatedListNameChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.relatedListName.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.relatedListName.value !== newValue) {
                this.propInputs.relatedListName.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.relatedListName = this.propInputs.relatedListName.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleRelatedListNameChange:', error);
        }
    }

    handleEnabledFieldsChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.enabledFields.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.enabledFields.value !== newValue) {
                this.propInputs.enabledFields.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.enabledFields = this.propInputs.enabledFields.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleEnabledFieldsChange:', error);
        }
    }

    handleFieldNamesChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.fieldNames.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.fieldNames.value !== newValue) {
                this.propInputs.fieldNames.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.fieldNames = this.propInputs.fieldNames.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleFieldNamesChange:', error);
        }
    }

    handleRelationshipFieldChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.relationshipField.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.relationshipField.value !== newValue) {
                this.propInputs.relationshipField.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.relationshipField = this.propInputs.relationshipField.value;
                
                this._value = JSON.stringify(tmpvalueObj);
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: this._value}}));
            }
        } catch (error) {
            console.error('Error in handleRelationshipFieldChange:', error);
        }
    }

    // SOQL Modal handlers
    handleSoqlQueryClick(e) {
        try {
            console.log('SOQL query click handler called');
            this.showSqlModal = true;
        } catch (error) {
            console.error('Error in handleSoqlQueryClick:', error);
        }
    }

    handleParseFields(e) {
        try {
            let tmpEl = this.template.querySelector('[data-key="' + this.propInputs.soqlQuery.key + '"]');
            if (tmpEl && tmpEl.value) {
                console.log('Parsing fields from current textarea value:', tmpEl.value);
                this.availableFields = this.parseFieldsFromSoql(tmpEl.value);
                this.fieldsInitialized = true;
                console.log('Parsed fields:', this.availableFields);
            } else {
                console.log('No query found in textarea');
                this.availableFields = [];
                this.fieldsInitialized = false;
            }
        } catch (error) {
            console.error('Error in handleParseFields:', error);
        }
    }

    handleCloseSqlModal(e) {
        try {
            console.log('Close SQL modal handler called');
            this.showSqlModal = false;
        } catch (error) {
            console.error('Error in handleCloseSqlModal:', error);
        }
    }

    handleSaveSoqlQuery(e) {
        try {
            console.log('Save SOQL query handler called');
            let tmpEl = this.template.querySelector('[data-key="' + this.propInputs.soqlQuery.key + '"]');
            
            this.propInputs.soqlQuery.value = tmpEl ? tmpEl.value : '';
            
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.soqlQuery = this.propInputs.soqlQuery.value;
            
            this.propInputs.soqlQuery.buttonLabel = (this.isStringEmpty(this.propInputs.soqlQuery.value) === false) ? 'Edit Query' : 'Set Query';
            
            const newAvailableFields = this.parseFieldsFromSoql(this.propInputs.soqlQuery.value);
            
            if (JSON.stringify(newAvailableFields) !== JSON.stringify(this.availableFields)) {
                this.availableFields = newAvailableFields;
                this.fieldsInitialized = newAvailableFields.length > 0;
            }
            
            // Auto-populate displayFields if no fields are selected
            if (this.selectedFields.length === 0 && this.availableFields.length > 0) {
                console.log('Auto-selecting all available fields since none were selected');
                this.selectedFields = this.availableFields.map(field => field.value);
            }
            
            // Update displayFields from selectedFields
            this.propInputs.displayFields.value = this.selectedFields.join(', ');
            tmpvalueObj.displayFields = this.propInputs.displayFields.value;
            
            console.log('Final configuration:', {
                soqlQuery: tmpvalueObj.soqlQuery,
                displayFields: tmpvalueObj.displayFields,
                selectedFields: this.selectedFields,
                availableFields: this.availableFields.length
            });
            
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
            
            this.handleCloseSqlModal();
        } catch (error) {
            console.error('Error in handleSaveSoqlQuery:', error);
        }
    }

    handleFieldOrderChange(e) {
        try {
            const newValue = this.getEventValue(e);
            console.log('Field order change handler called with:', newValue);
            this.selectedFields = Array.isArray(newValue) ? newValue : [];
            
            this.propInputs.displayFields.value = this.selectedFields.join(', ');
            
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.displayFields = this.propInputs.displayFields.value;
            tmpvalueObj.soqlQuery = this.propInputs.soqlQuery.value;
            
            this._value = JSON.stringify(tmpvalueObj);
            
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: this._value}}));
        } catch (error) {
            console.error('Error in handleFieldOrderChange:', error);
        }
    }

    // Record linking handlers
    handleRecordPageUrlChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.recordPageUrl.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            if (this.propInputs.recordPageUrl.value !== newValue) {
                this.propInputs.recordPageUrl.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.recordPageUrl = this.propInputs.recordPageUrl.value;
                
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: JSON.stringify(tmpvalueObj)}}));
            }
        } catch (error) {
            console.error('Error in handleRecordPageUrlChange:', error);
        }
    }

    handleEnableRecordLinkingChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.enableRecordLinking.key}"]`);
            const newValue = inputElement ? inputElement.checked : false;
            
            if (this.propInputs.enableRecordLinking.value !== newValue) {
                this.propInputs.enableRecordLinking.value = newValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.enableRecordLinking = this.propInputs.enableRecordLinking.value;
                
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: JSON.stringify(tmpvalueObj)}}));
            }
        } catch (error) {
            console.error('Error in handleEnableRecordLinkingChange:', error);
        }
    }

    // Table configuration handlers
    handleInitialRecordsToLoadChange(e) {
        try {
            const newValue = parseInt(this.getEventValue(e)) || 6;
            this.propInputs.initialRecordsToLoad.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.initialRecordsToLoad = this.propInputs.initialRecordsToLoad.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleInitialRecordsToLoadChange:', error);
        }
    }

    handleDefaultColumnWidthChange(e) {
        try {
            const inputElement = this.template.querySelector(`[data-key="${this.propInputs.defaultColumnWidth.key}"]`);
            const newValue = inputElement ? inputElement.value : '';
            
            const numericValue = newValue && newValue.trim() !== '' ? parseInt(newValue) : '';
            
            if (this.propInputs.defaultColumnWidth.value !== numericValue) {
                this.propInputs.defaultColumnWidth.value = numericValue;
                let tmpvalueObj = this.getValueObj();
                tmpvalueObj.defaultColumnWidth = this.propInputs.defaultColumnWidth.value;
                
                this.dispatchEvent(new CustomEvent("valuechange", 
                    {detail: {value: JSON.stringify(tmpvalueObj)}}));
            }
        } catch (error) {
            console.error('Error in handleDefaultColumnWidthChange:', error);
        }
    }

    handleShowRowNumberColumnChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.showRowNumberColumn.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.showRowNumberColumn = this.propInputs.showRowNumberColumn.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleShowRowNumberColumnChange:', error);
        }
    }

    handleResizeColumnDisabledChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.resizeColumnDisabled.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.resizeColumnDisabled = this.propInputs.resizeColumnDisabled.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleResizeColumnDisabledChange:', error);
        }
    }

    handleColumnSortingDisabledChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.columnSortingDisabled.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.columnSortingDisabled = this.propInputs.columnSortingDisabled.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleColumnSortingDisabledChange:', error);
        }
    }

    handleEnableInfiniteLoadingChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.enableInfiniteLoading.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.enableInfiniteLoading = this.propInputs.enableInfiniteLoading.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleEnableInfiniteLoadingChange:', error);
        }
    }

    handleFixedTableHeaderChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.fixedTableHeader.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.fixedTableHeader = this.propInputs.fixedTableHeader.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleFixedTableHeaderChange:', error);
        }
    }

    // ===== UTILITY METHODS =====

    getValueObj() {
        try {
            return (this.isStringEmpty(this.value)) ? {} : JSON.parse(this.value);
        } catch (e) {
            return {};
        }
    }

    getEventValue(event, isCheckbox = false) {
        if (!event) {
            console.warn('Event is null or undefined');
            return isCheckbox ? false : '';
        }
        
        if (!event.detail) {
            console.warn('Event detail is null or undefined');
            return isCheckbox ? false : '';
        }
        
        if (isCheckbox) {
            return event.detail.checked !== undefined ? event.detail.checked : false;
        } else {
            return event.detail.value !== undefined ? event.detail.value : '';
        }
    }

    // Utility methods
    isObjectEmpty(param) {
        return (param === undefined || param === null);
    }

    isStringEmpty(param) {
        return (typeof param === 'string') ? (this.isObjectEmpty(param) || param.trim() === '') : this.isObjectEmpty(param);
    }

    objectHasProperty(obj, key) {
        if (this.isObjectEmpty(obj) === true || this.isStringEmpty(key) === true) {
            return false;   
        }
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    getObjPropValue(data, keys) {
        if(typeof keys === 'string') {
            keys = keys.split('.')
        }
        
        let key = keys.shift();
        let keyData = data[key];
        
        if(this.isObjectEmpty(keyData)) {
            return undefined;
        }
         
        if(keys.length === 0){
            return keyData;
        }
        
        return this.getObjPropValue(Object.assign({}, keyData), keys);
    }

    setObjPropValue(data, key, value) {
        let schema = data;
        let pList = key.split('.');
        let len = pList.length;
        for(let i = 0; i < len-1; i++) {
            let elem = pList[i];
            if( !schema[elem] ) schema[elem] = {}
            schema = schema[elem];
        }

        schema[pList[len-1]] = value;
        return data;
    }
}