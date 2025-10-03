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
        iconType: {
            key: 'iconType',
            label: 'Related List Icon Type',
            type: 'select',
            help: 'Choose between using a standard SLDS icon or a custom icon component slot.',
            required: false,
            valuePath: 'iconType',
            value: 'slds',
            doSetDefaultValue: true,
            classes: defaultCSSClasses,
            options: [
                { label: 'SLDS Icon', value: 'slds' },
                { label: 'Slot', value: 'slot' }
            ]
        },
        relatedListIcon: {
            key: 'relatedListIcon',
            label: 'SLDS Icon Name',
            type: 'text',
            help: 'SLDS icon name (e.g., \'standard:contact\', \'utility:activity\').',
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
        useCustomQuery: {
            key: 'useCustomQuery',
            label: 'Data Source Mode',
            type: 'toggle',
            help: 'Choose your data source: Related List API (fast, automatic) or Custom SOQL (flexible, advanced)',
            required: false,
            valuePath: 'useCustomQuery',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses,
            options: [
                { label: 'Related List API', value: false },
                { label: 'Custom SOQL', value: true }
            ]
        },
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

        showDebugInfo: {
            key: 'showDebugInfo',
            label: 'Show Debug Information',
            type: 'checkbox',
            help: 'Display detailed configuration and performance information below the component. For development and troubleshooting only.',
            required: false,
            valuePath: 'showDebugInfo',
            value: false,
            doSetDefaultValue: true,
            classes: defaultCSSClasses
        }
    };

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
                    
                    if (key === 'soqlQuery') {
                        if (!this.isStringEmpty(this.propInputs[key].value)) {
                            this.propInputs[key].buttonLabel = 'Edit Query';
                        }
                    }
                }
            }
        }

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

    get showSldsIconInput() {
    return this.propInputs.iconType.value === 'slds';
}

    get showIconSlotMessage() {
        return this.propInputs.iconType.value === 'slot';
    }

    initializeDualListbox(config) {
        const soqlQuery = config.soqlQuery || '';
        const displayFields = config.displayFields || '';
        
        this.availableFields = this.parseFieldsFromSoql(soqlQuery);
        this.selectedFields = displayFields ? displayFields.split(',').map(f => f.trim()).filter(f => f) : [];
        
        this.fieldsInitialized = this.availableFields.length > 0;
    }

    parseFieldsFromSoql(soqlQuery) {
        if (!soqlQuery) {
            return [];
        }
        
        try {
            const normalizedQuery = soqlQuery.replace(/\s+/g, ' ').trim();
            const selectMatch = normalizedQuery.match(/SELECT\s+(.*?)\s+FROM/i);
            
            if (!selectMatch) {
                return [];
            }
            
            const fieldsString = selectMatch[1];
            const fields = fieldsString.split(',').map(field => {
                const cleanField = field.trim();
                return {
                    label: cleanField,
                    value: cleanField
                };
            });
            
            return fields;
        } catch (e) {
            console.error('Error parsing SOQL:', e);
            return [];
        }
    }

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

    handleNumberOfSlotsChange(e) {
        try {
            const newValue = this.getEventValue(e);
            this.propInputs.numberOfSlots.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.numberOfSlots = this.propInputs.numberOfSlots.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleNumberOfSlotsChange:', error);
        }
    }

    handleIconTypeChange(e) {
        try {
            const newValue = this.getEventValue(e);
            this.propInputs.iconType.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.iconType = this.propInputs.iconType.value;
            
            // Set useIconSlot based on selection
            tmpvalueObj.useIconSlot = (newValue === 'slot');
            
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleIconTypeChange:', error);
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

    handleUseCustomQueryChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.useCustomQuery.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.useCustomQuery = this.propInputs.useCustomQuery.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleUseCustomQueryChange:', error);
        }
    }

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

    handleSoqlQueryClick(e) {
        try {
            this.showSqlModal = true;
        } catch (error) {
            console.error('Error in handleSoqlQueryClick:', error);
        }
    }

    handleParseFields(e) {
        try {
            let tmpEl = this.template.querySelector('[data-key="' + this.propInputs.soqlQuery.key + '"]');
            if (tmpEl && tmpEl.value) {
                this.availableFields = this.parseFieldsFromSoql(tmpEl.value);
                this.fieldsInitialized = true;
            } else {
                this.availableFields = [];
                this.fieldsInitialized = false;
            }
        } catch (error) {
            console.error('Error in handleParseFields:', error);
        }
    }

    handleCloseSqlModal(e) {
        try {
            this.showSqlModal = false;
        } catch (error) {
            console.error('Error in handleCloseSqlModal:', error);
        }
    }

    handleSaveSoqlQuery(e) {
        try {
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
            
            if (this.selectedFields.length === 0 && this.availableFields.length > 0) {
                this.selectedFields = this.availableFields.map(field => field.value);
            }
            
            this.propInputs.displayFields.value = this.selectedFields.join(', ');
            tmpvalueObj.displayFields = this.propInputs.displayFields.value;
            
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

    handleShowDebugInfoChange(e) {
        try {
            const newValue = this.getEventValue(e, true);
            this.propInputs.showDebugInfo.value = newValue;
            let tmpvalueObj = this.getValueObj();
            tmpvalueObj.showDebugInfo = this.propInputs.showDebugInfo.value;
            this.dispatchEvent(new CustomEvent("valuechange", 
                {detail: {value: JSON.stringify(tmpvalueObj)}}));
        } catch (error) {
            console.error('Error in handleShowDebugInfoChange:', error);
        }
    }

    getValueObj() {
        try {
            return (this.isStringEmpty(this.value)) ? {} : JSON.parse(this.value);
        } catch (e) {
            return {};
        }
    }

    getEventValue(event, isCheckbox = false) {
        if (!event) {
            return isCheckbox ? false : '';
        }
        
        if (!event.detail) {
            return isCheckbox ? false : '';
        }
        
        if (isCheckbox) {
            return event.detail.checked !== undefined ? event.detail.checked : false;
        } else {
            return event.detail.value !== undefined ? event.detail.value : '';
        }
    }

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
            keys = keys.split('.');
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
            if( !schema[elem] ) schema[elem] = {};
            schema = schema[elem];
        }

        schema[pList[len-1]] = value;
        return data;
    }
}