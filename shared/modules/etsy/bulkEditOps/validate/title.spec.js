import { expect } from 'chai';

import { validateAddBefore, validateAddAfter, validateReplace } from './title';

describe('TitleControls - validate', () => {
  describe('validateAddBefore', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateAddBefore({value: 'test'});

      expect(errors).to.eql({value: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateAddBefore({value: ''});

      expect(!!errors.value).to.be.true;
    });

    it('should set error if input starts with non-alphanumeric character', () => {
      expect(!!validateAddBefore({value: 'sdf'}).value).to.be.false;
      expect(!!validateAddBefore({value: '1sdf'}).value).to.be.false;
      expect(!!validateAddBefore({value: ' sdf'}).value).to.be.true;
      expect(!!validateAddBefore({value: '{sdf'}).value).to.be.true;
      expect(!!validateAddBefore({value: '*sdf'}).value).to.be.true;
    });

    it('should set error if input contains other than allowed characters', () => {
      expect(!!validateAddBefore({value: 'Only a-z, 0-9, / \ . , ( ) - = + " % : ; & ! ™©® characters are allowed'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'sdf$'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf^'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf`'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¢'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf£'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¤'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¥'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¦'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¨'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf­'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¯'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf°'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf²'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf³'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf´'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¸'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¹'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¼'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf½'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf¾'}).value).to.be.true;
    });

    it('should set error if input contains multpiple characters which are allowed only once', () => {
      expect(!!validateAddBefore({value: 'test % : & +'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'sdf%%'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf&&'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf::'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf++'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf%%%%'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf&&&&'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf++++'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'sdf::::'}).value).to.be.true;
    });

    it('should set error if input contains more than 3 all upercase words', () => {
      expect(!!validateAddBefore({value: 'test'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'testTEST TEST'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'testTEST TEST'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'testTEST TEST TEST'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'testTEST TEST TEST TEST'}).value).to.be.false;
      expect(!!validateAddBefore({value: 'testTEST TEST TEST TEST TEST'}).value).to.be.true;
      expect(!!validateAddBefore({value: 'testTEST TEST TEST TEST TEST TEST'}).value).to.be.true;
    });

    it('should allow single letter capital words', () => {
      expect(!!validateAddBefore({value: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'}).value).to.be.false;
    });

    it('words with numbers do not count as all capital words', () => {
      expect(!!validateAddBefore({value: '2XL X2L XE2 2XL X2L XE2'}).value).to.be.false;
    });

    it('should not set error on unicode characters in input', () => {
      expect(!!validateAddBefore({value: 'ěščřžýáíéÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'}).value).to.be.false;
    });
  });

  describe('validateAddAfter', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateAddAfter({value: 'test'});

      expect(errors).to.eql({value: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateAddAfter({value: ''});

      expect(!!errors.value).to.be.true;
    });

    it('should not set error if input starts with other than letters', () => {
      expect(!!validateAddAfter({value: 'sdf'}).value).to.be.false;
      expect(!!validateAddAfter({value: '1sdf'}).value).to.be.false;
      expect(!!validateAddAfter({value: ' sdf'}).value).to.be.false;
      expect(!!validateAddAfter({value: '{sdf'}).value).to.be.false;
      expect(!!validateAddAfter({value: '*sdf'}).value).to.be.false;
    });

    it('should set error if input contains other than allowed characters', () => {
      expect(!!validateAddAfter({value: 'Only a-z, 0-9, / \ . , ( ) - = + " % : ; & ! ™©® characters are allowed'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'sdf$'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf^'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf`'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¢'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf£'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¤'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¥'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¦'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¨'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf­'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¯'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf°'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf²'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf³'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf´'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¸'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¹'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¼'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf½'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf¾'}).value).to.be.true;
    });

    it('should set error if input contains multpiple characters which are allowed only once', () => {
      expect(!!validateAddAfter({value: 'test % : & +'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'sdf%%'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf&&'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf::'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf++'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf%%%%'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf&&&&'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf++++'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'sdf::::'}).value).to.be.true;
    });

    it('should set error if input contains more than 3 all upercase words', () => {
      expect(!!validateAddAfter({value: 'test'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'testTEST TEST'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'testTEST TEST'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'testTEST TEST TEST'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'testTEST TEST TEST TEST'}).value).to.be.false;
      expect(!!validateAddAfter({value: 'testTEST TEST TEST TEST TEST'}).value).to.be.true;
      expect(!!validateAddAfter({value: 'testTEST TEST TEST TEST TEST TEST'}).value).to.be.true;
    });

    it('should not set error on unicode characters in input', () => {
      expect(!!validateAddAfter({value: 'ěščřžýáíéÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'}).value).to.be.false;
    });
  });

  describe('validateReplace', ()=> {
    it('should set no errors valid value', () => {
      const errors = validateReplace({replace: 'test'});

      expect(errors).to.eql({replace: undefined});
    });

    it('should set error on empty input', () => {
      const errors = validateReplace({replace: ''});

      expect(!!errors.replace).to.be.true;
    });

    it('should not set error if input starts with other than letters', () => {
      expect(!!validateReplace({replace: 'sdf'}).replace).to.be.false;
      expect(!!validateReplace({replace: '1sdf'}).replace).to.be.false;
      expect(!!validateReplace({replace: ' sdf'}).replace).to.be.false;
      expect(!!validateReplace({replace: '{sdf'}).replace).to.be.false;
      expect(!!validateReplace({replace: '*sdf'}).replace).to.be.false;
    });

    it('should set error if input contains other than allowed characters', () => {
      expect(!!validateReplace({replace: 'Only a-z, 0-9, / \ . , ( ) - = + " % : ; & ! ™©® characters are allowed'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'sdf$'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf^'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf`'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¢'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf£'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¤'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¥'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¦'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¨'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf­'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¯'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf°'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf²'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf³'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf´'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¸'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¹'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¼'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf½'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf¾'}).replace).to.be.true;
    });

    it('should set error if input contains multpiple characters which are allowed only once', () => {
      expect(!!validateReplace({replace: 'test % : & +'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'sdf%%'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf&&'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf::'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf++'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf%%%%'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf&&&&'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf++++'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'sdf::::'}).replace).to.be.true;
    });

    it('should set error if input contains more than 3 all upercase words', () => {
      expect(!!validateReplace({replace: 'test'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'testTEST TEST'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'testTEST TEST'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'testTEST TEST TEST'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'testTEST TEST TEST TEST'}).replace).to.be.false;
      expect(!!validateReplace({replace: 'testTEST TEST TEST TEST TEST'}).replace).to.be.true;
      expect(!!validateReplace({replace: 'testTEST TEST TEST TEST TEST TEST'}).replace).to.be.true;
    });

    it('should not set error on unicode characters in input', () => {
      expect(!!validateReplace({replace: 'ěščřžýáíéÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'}).replace).to.be.false;
    });

    it('should not validate find value', () => {
      expect(!!validateReplace({find: 'sdf'}).find).to.be.false;
      expect(!!validateReplace({find: '1sdf'}).find).to.be.false;
      expect(!!validateReplace({find: ' sdf'}).find).to.be.false;
      expect(!!validateReplace({find: '{sdf'}).find).to.be.false;
      expect(!!validateReplace({find: '*sdf'}).find).to.be.false;
      expect(!!validateReplace({find: '%^$*(@#&$¢£¤¥¦¨­¯°²³´¸¹¼½¾'}).find).to.be.false;
      expect(!!validateReplace({find: 'ěščřžýáíéÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ'}).find).to.be.false;
      expect(!!validateReplace({find: 'sdf%%%%'}).find).to.be.false;
      expect(!!validateReplace({find: ''}).find).to.be.false;
      expect(!!validateReplace({find: 'testTEST TEST TEST TEST TEST TEST'}).find).to.be.false;
    });
  });
});
