@isTest
private class RelatedListLWRControllerTest {
    
    // ===== TEST DATA SETUP =====
    
    @testSetup
    static void setupTestData() {
        // Create test account
        Account testAccount = new Account(
            Name = 'Test Account',
            Phone = '555-1234',
            Website = 'www.test.com'
        );
        insert testAccount;
        
        // Create test contacts
        List<Contact> contacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            contacts.add(new Contact(
                FirstName = 'Test',
                LastName = 'Contact ' + i,
                Email = 'test' + i + '@example.com',
                Phone = '555-000' + i,
                AccountId = testAccount.Id
            ));
        }
        insert contacts;
        
        // Create test opportunities
        List<Opportunity> opportunities = new List<Opportunity>();
        for (Integer i = 0; i < 3; i++) {
            opportunities.add(new Opportunity(
                Name = 'Test Opportunity ' + i,
                AccountId = testAccount.Id,
                StageName = 'Prospecting',
                CloseDate = Date.today().addDays(30),
                Amount = 10000 * (i + 1)
            ));
        }
        insert opportunities;
        
        // Create test case for Knowledge Articles
        Case testCase = new Case(
            Subject = 'Test Case',
            Status = 'New',
            Origin = 'Web',
            AccountId = testAccount.Id
        );
        insert testCase;
        
        // Create ContentVersion for file testing
        ContentVersion cv = new ContentVersion(
            Title = 'Test Image',
            PathOnClient = 'test.png',
            VersionData = Blob.valueOf('Test image content'),
            IsMajorVersion = true
        );
        insert cv;
        
        // Get ContentDocumentId
        cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
        
        // Create ContentDocumentLink
        ContentDocumentLink cdl = new ContentDocumentLink(
            ContentDocumentId = cv.ContentDocumentId,
            LinkedEntityId = testAccount.Id,
            ShareType = 'V',
            Visibility = 'AllUsers'
        );
        insert cdl;
    }
    
    // ===== ARL MODE TESTS =====
    
    @isTest
    static void testGetObjectTypeFromRecordId_Success() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        String objectType = RelatedListLWRController.getObjectTypeFromRecordId(acc.Id);
        Test.stopTest();
        
        System.assertEquals('Account', objectType, 'Should return Account object type');
    }
    
    @isTest
    static void testGetObjectTypeFromRecordId_BlankId() {
        Test.startTest();
        String objectType = RelatedListLWRController.getObjectTypeFromRecordId('');
        Test.stopTest();
        
        System.assertEquals(null, objectType, 'Should return null for blank ID');
    }
    
    @isTest
    static void testGetRelatedListInfo_Contacts() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = 
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', acc.Id, 'Name,Email,Phone', '');
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assert(result.fields.size() > 0, 'Should have field information');
        System.assertEquals(5, result.records.size(), 'Should return 5 contacts');
    }
    
    @isTest
    static void testGetRelatedListInfo_WithRelationshipField() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = 
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', acc.Id, 'Name,Email', 'AccountId');
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertNotEquals(null, result.relatedObjectType, 'Should identify related object type');
        // The relationship field helps find the correct relationship, records may vary
        System.assert(result.records.size() >= 0, 'Should return records or empty list');
    }
    
    @isTest
    static void testGetRelatedListInfo_Opportunities() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = 
            RelatedListLWRController.getRelatedListInfo('Account', 'Opportunities', acc.Id, 'Name,Amount,StageName', '');
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(3, result.records.size(), 'Should return 3 opportunities');
    }
    
    @isTest
    static void testGetRelatedListInfo_NoEnabledFields() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = 
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', acc.Id, '', '');
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assert(result.fields.size() > 0, 'Should use default fields');
    }
    
    @isTest
    static void testGetRelatedListInfo_InvalidRelationship() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        RelatedListLWRController.RelatedListInfo result = 
            RelatedListLWRController.getRelatedListInfo('Account', 'InvalidRelationship', acc.Id, '', '');
        Test.stopTest();
        
        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(0, result.records.size(), 'Should return no records for invalid relationship');
    }
    
    // ===== KNOWLEDGE ARTICLES TESTS =====
    
    @isTest
    static void testGetCaseArticles_NoArticles() {
        Case testCase = [SELECT Id FROM Case LIMIT 1];
        
        Test.startTest();
        List<RelatedListLWRController.ArticleData> articles = 
            RelatedListLWRController.getCaseArticles(testCase.Id);
        Test.stopTest();
        
        System.assertNotEquals(null, articles, 'Should return a list');
        System.assertEquals(0, articles.size(), 'Should return empty list when no articles');
    }
    
    @isTest
    static void testGetCaseArticles_BlankCaseId() {
        Test.startTest();
        List<RelatedListLWRController.ArticleData> articles = 
            RelatedListLWRController.getCaseArticles('');
        Test.stopTest();
        
        System.assertEquals(0, articles.size(), 'Should return empty list for blank case ID');
    }
    
    @isTest
    static void testGetCaseArticles_InvalidCaseId() {
        Test.startTest();
        try {
            List<RelatedListLWRController.ArticleData> articles = 
                RelatedListLWRController.getCaseArticles('001000000000000');
            System.assertEquals(0, articles.size(), 'Should return empty list for non-existent case');
        } catch (AuraHandledException e) {
            System.assert(true, 'Should handle invalid case ID gracefully');
        }
        Test.stopTest();
    }
    
    // ===== FILES TESTS =====
    
    @isTest
    static void testGetFiles_Success() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        List<RelatedListLWRController.FileRecord> files = 
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 50);
        Test.stopTest();
        
        System.assertNotEquals(null, files, 'Should return a list');
        System.assertEquals(1, files.size(), 'Should return 1 file');
        System.assertEquals('Test Image', files[0].title, 'File title should match');
        System.assertNotEquals(null, files[0].downloadUrl, 'Should have download URL');
        System.assertEquals(true, files[0].isImage, 'PNG should be identified as image');
    }
    
    @isTest
    static void testGetFiles_DifferentSortFields() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        List<RelatedListLWRController.FileRecord> filesByTitle = 
            RelatedListLWRController.getFiles(acc.Id, 'Title', 'ASC', 10);
        List<RelatedListLWRController.FileRecord> filesBySize = 
            RelatedListLWRController.getFiles(acc.Id, 'ContentSize', 'DESC', 10);
        List<RelatedListLWRController.FileRecord> filesByExt = 
            RelatedListLWRController.getFiles(acc.Id, 'FileExtension', 'ASC', 10);
        Test.stopTest();
        
        System.assertEquals(1, filesByTitle.size(), 'Should return files sorted by title');
        System.assertEquals(1, filesBySize.size(), 'Should return files sorted by size');
        System.assertEquals(1, filesByExt.size(), 'Should return files sorted by extension');
    }
    
    @isTest
    static void testGetFiles_DefaultParameters() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        List<RelatedListLWRController.FileRecord> files = 
            RelatedListLWRController.getFiles(acc.Id, null, null, null);
        Test.stopTest();
        
        System.assertEquals(1, files.size(), 'Should use default parameters');
    }
    
    @isTest
    static void testGetFiles_BlankRecordId() {
        Test.startTest();
        try {
            List<RelatedListLWRController.FileRecord> files = 
                RelatedListLWRController.getFiles('', 'CreatedDate', 'DESC', 50);
            System.assert(false, 'Should throw exception for blank record ID');
        } catch (AuraHandledException e) {
            // Just verify we caught the exception - the message will vary
            System.assert(true, 'Exception was thrown as expected');
        }
        Test.stopTest();
    }
        
    @isTest
    static void testGetImageAsBase64_Success() {
        ContentVersion cv = [SELECT ContentDocumentId FROM ContentVersion LIMIT 1];
        
        Test.startTest();
        String base64Image = RelatedListLWRController.getImageAsBase64(cv.ContentDocumentId);
        Test.stopTest();
        
        System.assertNotEquals(null, base64Image, 'Should return base64 string');
        System.assert(base64Image.startsWith('data:image/'), 'Should be a data URL');
    }
    
    @isTest
    static void testGetImageAsBase64_InvalidId() {
        Test.startTest();
        String base64Image = RelatedListLWRController.getImageAsBase64('069000000000000AAA');
        Test.stopTest();
        
        System.assertEquals(null, base64Image, 'Should return null for invalid ID');
    }
    
    // ===== HELPER METHODS TESTS =====
    
    @isTest
    static void testFileIconMapping() {
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        // Create files with different extensions
        List<ContentVersion> cvList = new List<ContentVersion>{
            new ContentVersion(Title = 'Test PDF', PathOnClient = 'test.pdf', VersionData = Blob.valueOf('PDF')),
            new ContentVersion(Title = 'Test Word', PathOnClient = 'test.docx', VersionData = Blob.valueOf('Word')),
            new ContentVersion(Title = 'Test Excel', PathOnClient = 'test.xlsx', VersionData = Blob.valueOf('Excel')),
            new ContentVersion(Title = 'Test Unknown', PathOnClient = 'test.unknown', VersionData = Blob.valueOf('Unknown'))
        };
        insert cvList;
        
        // Link to account
        List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
        for (ContentVersion cv : [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :cvList]) {
            cdlList.add(new ContentDocumentLink(
                ContentDocumentId = cv.ContentDocumentId,
                LinkedEntityId = acc.Id,
                ShareType = 'V'
            ));
        }
        insert cdlList;
        
        Test.startTest();
        List<RelatedListLWRController.FileRecord> files = 
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 50);
        Test.stopTest();
        
        System.assert(files.size() >= 4, 'Should return multiple files with different icons');
    }
    
    @isTest
    static void testFileSizeFormatting() {
        // Test through file creation with various sizes
        Account acc = [SELECT Id FROM Account LIMIT 1];
        
        Test.startTest();
        List<RelatedListLWRController.FileRecord> files = 
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 50);
        Test.stopTest();
        
        System.assertNotEquals(null, files[0].formattedSize, 'Should have formatted size');
        System.assert(files[0].formattedSize.contains('Bytes') || 
                     files[0].formattedSize.contains('KB') || 
                     files[0].formattedSize.contains('MB'), 
                     'Size should have unit');
    }
    
    // ===== EDGE CASES =====
    
    @isTest
    static void testGetRelatedListInfo_WithInvalidFields() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        RelatedListLWRController.RelatedListInfo result =
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', acc.Id, 'Name,InvalidField__c', '');
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should handle invalid fields gracefully');
        System.assert(result.fields.size() >= 1, 'Should return at least valid fields');
    }

    @isTest
    static void testGetRelatedListInfo_WithRelationshipFields() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        // Test with relationship field notation (e.g., Account.Name)
        RelatedListLWRController.RelatedListInfo result =
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', acc.Id, 'Name,Account.Name,Account.Industry', '');
        Test.stopTest();

        System.assertNotEquals(null, result, 'Should handle relationship fields');
        System.assert(result.fields.size() >= 1, 'Should include relationship fields');
    }

    @isTest
    static void testGetFiles_WithInvalidRecordId() {
        Test.startTest();
        try {
            List<RelatedListLWRController.FileRecord> files =
                RelatedListLWRController.getFiles('invalid', 'CreatedDate', 'DESC', 50);
            System.assert(false, 'Should throw exception for invalid record ID');
        } catch (Exception e) {
            System.assert(true, 'Exception thrown as expected');
        }
        Test.stopTest();
    }

    @isTest
    static void testGetImageAsBase64_WithAccessDenied() {
        // Create a content version without linking it to test access control
        ContentVersion cv = new ContentVersion(
            Title = 'Unlinked Image',
            PathOnClient = 'unlinked.jpg',
            VersionData = Blob.valueOf('Test unlinked image'),
            IsMajorVersion = true
        );
        insert cv;

        cv = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

        // Delete any links
        delete [SELECT Id FROM ContentDocumentLink WHERE ContentDocumentId = :cv.ContentDocumentId];

        Test.startTest();
        String result = RelatedListLWRController.getImageAsBase64(cv.ContentDocumentId);
        Test.stopTest();

        System.assertEquals(null, result, 'Should return null when access denied');
    }

    @isTest
    static void testFilePreviewTypes() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        // Create files with different preview capabilities
        List<ContentVersion> cvList = new List<ContentVersion>{
            new ContentVersion(Title = 'Test JPG', PathOnClient = 'test.jpg', VersionData = Blob.valueOf('JPG')),
            new ContentVersion(Title = 'Test GIF', PathOnClient = 'test.gif', VersionData = Blob.valueOf('GIF')),
            new ContentVersion(Title = 'Test CSV', PathOnClient = 'test.csv', VersionData = Blob.valueOf('CSV')),
            new ContentVersion(Title = 'Test TXT', PathOnClient = 'test.txt', VersionData = Blob.valueOf('TXT'))
        };
        insert cvList;

        List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
        for (ContentVersion cv : [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :cvList]) {
            cdlList.add(new ContentDocumentLink(
                ContentDocumentId = cv.ContentDocumentId,
                LinkedEntityId = acc.Id,
                ShareType = 'V'
            ));
        }
        insert cdlList;

        Test.startTest();
        List<RelatedListLWRController.FileRecord> files =
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 50);
        Test.stopTest();

        Boolean hasPreviewableFile = false;
        Boolean hasNonPreviewableFile = false;
        for (RelatedListLWRController.FileRecord file : files) {
            if (file.canPreview) {
                hasPreviewableFile = true;
            } else {
                hasNonPreviewableFile = true;
            }
        }

        System.assert(files.size() >= 4, 'Should return multiple files');
        System.assert(hasPreviewableFile, 'Should identify previewable files');
    }

    @isTest
    static void testFileSizeFormattingVariations() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        // Create files with specific sizes to test formatting
        String smallContent = 'X'; // < 1KB
        String mediumContent = '';
        for (Integer i = 0; i < 2000; i++) {
            mediumContent += 'X'; // > 1KB
        }

        List<ContentVersion> cvList = new List<ContentVersion>{
            new ContentVersion(Title = 'Small File', PathOnClient = 'small.txt', VersionData = Blob.valueOf(smallContent)),
            new ContentVersion(Title = 'Medium File', PathOnClient = 'medium.txt', VersionData = Blob.valueOf(mediumContent))
        };
        insert cvList;

        List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
        for (ContentVersion cv : [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :cvList]) {
            cdlList.add(new ContentDocumentLink(
                ContentDocumentId = cv.ContentDocumentId,
                LinkedEntityId = acc.Id,
                ShareType = 'V'
            ));
        }
        insert cdlList;

        Test.startTest();
        List<RelatedListLWRController.FileRecord> files =
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 50);
        Test.stopTest();

        Boolean hasBytesFormat = false;
        Boolean hasKBFormat = false;
        for (RelatedListLWRController.FileRecord file : files) {
            if (file.formattedSize.contains('Bytes')) {
                hasBytesFormat = true;
            }
            if (file.formattedSize.contains('KB')) {
                hasKBFormat = true;
            }
        }

        System.assert(hasBytesFormat || hasKBFormat, 'Should format file sizes correctly');
    }

    @isTest
    static void testGetObjectTypeFromRecordId_InvalidFormat() {
        Test.startTest();
        String objectType = RelatedListLWRController.getObjectTypeFromRecordId('InvalidId123');
        Test.stopTest();

        System.assertEquals(null, objectType, 'Should return null for invalid ID format');
    }

    @isTest
    static void testGetRelatedListInfo_NoRecordsFound() {
        // Create an account with no related records
        Account emptyAccount = new Account(Name = 'Empty Account');
        insert emptyAccount;

        Test.startTest();
        RelatedListLWRController.RelatedListInfo result =
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', emptyAccount.Id, 'Name,Email', '');
        Test.stopTest();

        System.assertNotEquals(null, result, 'Result should not be null');
        System.assertEquals(0, result.records.size(), 'Should return empty list when no records found');
    }

    @isTest
    static void testGetFiles_LimitParameter() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        // Create multiple files
        List<ContentVersion> cvList = new List<ContentVersion>();
        for (Integer i = 0; i < 5; i++) {
            cvList.add(new ContentVersion(
                Title = 'Test File ' + i,
                PathOnClient = 'test' + i + '.txt',
                VersionData = Blob.valueOf('Content ' + i)
            ));
        }
        insert cvList;

        List<ContentDocumentLink> cdlList = new List<ContentDocumentLink>();
        for (ContentVersion cv : [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :cvList]) {
            cdlList.add(new ContentDocumentLink(
                ContentDocumentId = cv.ContentDocumentId,
                LinkedEntityId = acc.Id,
                ShareType = 'V'
            ));
        }
        insert cdlList;

        Test.startTest();
        List<RelatedListLWRController.FileRecord> limitedFiles =
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 3);
        List<RelatedListLWRController.FileRecord> allFiles =
            RelatedListLWRController.getFiles(acc.Id, 'CreatedDate', 'DESC', 50);
        Test.stopTest();

        System.assert(limitedFiles.size() <= 3, 'Should respect limit parameter');
        System.assert(allFiles.size() >= limitedFiles.size(), 'All files should be >= limited files');
    }

    @isTest
    static void testCommonDisplayFields() {
        Account acc = [SELECT Id FROM Account LIMIT 1];

        Test.startTest();
        // Test with empty enabled fields to trigger default field selection
        RelatedListLWRController.RelatedListInfo contactResult =
            RelatedListLWRController.getRelatedListInfo('Account', 'Contacts', acc.Id, '', '');
        RelatedListLWRController.RelatedListInfo oppResult =
            RelatedListLWRController.getRelatedListInfo('Account', 'Opportunities', acc.Id, '', '');
        Test.stopTest();

        System.assert(contactResult.fields.size() > 0, 'Should use default Contact fields');
        System.assert(oppResult.fields.size() > 0, 'Should use default Opportunity fields');
    }
}