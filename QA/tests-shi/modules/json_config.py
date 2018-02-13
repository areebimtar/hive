import logging
import json


class SimpleDictToObject(object):
    """
    Class that works as a wrapper for a dictionary.
    It is also possible to reference dictianary keys as attributes of the class instance
    """
    def __init__(self, dictionary: dict):
        self.dictionary = dictionary

    def __getattr__(self, item):
        try:
            if isinstance(self.dictionary[item], dict):
                return SimpleDictToObject(self.dictionary[item])
            else:
                return self.dictionary[item]
        except KeyError:
            raise AttributeError('Attribute is not defined: ' + item)

    def __getitem__(self, key):
        return self.dictionary[key]


class JSONConfig(SimpleDictToObject):
    """
    Class that loads json configs and provides them as an object
    """
    def __init__(self, *file_names):
        cfg_dict = {}
        for file_name in file_names:
            logging.info('Loading config file %s' % file_name)
            with open(file_name) as fp:
                file_dict = json.load(fp)
            cfg_dict = {**cfg_dict, **file_dict}
        super().__init__(cfg_dict)
