#!/usr/bin/python3
import json
import re
import psycopg2


RECIPIENT_RE = '(.*)-  *(Men|Women|Unisex Adults|Teen Boys|Teen Girls|Teens|Boys|Girls|Children|Baby Boys|Baby Girls|Babies|Birds|Cats|Dogs|Pets) *$'
SCALING_UNITS = {
        "cm": 328,
        "mL": 336,
        "L": 337,
        "fl oz": 335,
        "inches": 327,
        "g": 333,
}
ALPHA_VALUES = [ "XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", ]
RECIPIENTS = {
        "men":"266817059",
        "women": "266817061",
        "unisex_adults": "266817065",
        "teen_boys": "266817067",
        "teen_girls": "266817069",
        "teens": "266817071",
        "boys": "266817073",
        "girls": "266817077",
        "children": "266817079",
        "baby_boys": "266817081",
        "baby_girls": "266817083",
        "babies": "266817085",
        "birds": "266817087",
        "cats": "301958802",
        "dogs": "301959052",
        "pets": "301959242",
}
ALPHA_ID = 301
SCALING_OPTIONS = {
            "266817059" : "Men",
            "266817061" : "Women",
            "266817065" : "Unisex Adults",
            "266817067" : "Teen Boys",
            "266817069" : "Teen Girls",
            "266817071" : "Teens",
            "266817073" : "Boys",
            "266817077" : "Girls",
            "266817079" : "Children",
            "266817081" : "Baby Boys",
            "266817083" : "Baby Girls",
            "266817085" : "Babies",
            "266817087" : "Birds",
            "301" : "Alpha",
            "301958802" : "Cats",
            "301959052" : "Dogs",
            "301959242" : "Pets",
            "302" : "US",
            "302326609" : "Not specified",
            "303" : "Months",
            "304" : "Years",
            "305" : "US",
            "306" : "US",
            "307" : "US",
            "308" : "US",
            "309" : "US",
            "310" : "US",
            "311" : "US",
            "312" : "US",
            "313" : "US Plus Size",
            "314" : "US",
            "315" : "US",
            "316" : "US",
            "317" : "US",
            "318" : "US",
            "319" : "US",
            "320" : "US",
            "321" : "US",
            "322" : "US",
            "323" : "US",
            "324" : "US",
            "325" : "US",
            "326" : "US",
            "327" : "Inches",
            "328" : "Centimeters",
            "329" : "Other",
            "330" : "US",
            "335" : "Fluid Ounces",
            "336" : "Millilitres",
            "337" : "Litres",
            "353" : "UK",
            "354" : "EU",
            "355" : "JP",
            "356" : "UK",
            "357" : "EU",
            "358" : "JP",
            "359" : "UK",
            "360" : "JP",
            "361" : "EU",
            "362" : "US",
            "363" : "UK",
            "364" : "EU",
            "365" : "JP",
            "366" : "UK",
            "367" : "EU",
            "368" : "JP",
            "369" : "UK",
            "370" : "EU",
            "371" : "JP",
            "372" : "UK",
            "373" : "EU",
            "374" : "JP",
            "375" : "UK",
            "376" : "EU",
            "377" : "JP",
            "378" : "UK",
            "379" : "EU",
            "380" : "JP",
            "381" : "UK",
            "382" : "EU",
            "383" : "JP",
            "384" : "UK",
            "385" : "EU",
            "386" : "JP",
            "387" : "UK",
            "388" : "EU",
            "389" : "JP",
            "391" : "UK",
            "392" : "EU",
            "393" : "JP",
            "394" : "EU",
            "395" : "JP",
            "396" : "UK",
            "397" : "EU",
            "398" : "JP",
            "399" : "EU",
            "400" : "UK",
            "333" : "Grams"
}

def debug(*args):
    pass
    #print("\t**", *args)

def get_scale(value, formatted_value, property_id, taxonomy_id, recipient_name, prop_set):
    if taxonomy_id is None:
        return None
    # get options
    property_id = str(property_id)
    taxonomy_id = str(taxonomy_id)
    recipient_name = str(recipient_name)
    if recipient_name in RECIPIENTS:
        recipient_id = RECIPIENTS[recipient_name]
    else:
        recipient_id = None


    if property_id not in prop_set[taxonomy_id]['results'][0]['qualifiers']:
        debug("No qualifiers found")
        return None
    property_data = prop_set[taxonomy_id]['results'][0]['qualifiers'][property_id][0]
    recipient_results = property_data['results']
    if recipient_results is None:
        options = property_data['options']
    else:
        if recipient_id is None:
            debug("Required recipient_id is missing")
            possible_recipients = property_data['results'].keys()
            all_opt = {}
            for pr in possible_recipients:
                for o in recipient_results[pr][0]['options']:
                    all_opt[o] = 1
            options = list(all_opt.keys())
        else:
            if property_data['aliases'] is not None and  recipient_id in property_data['aliases']:
                alias = str(property_data['aliases'][recipient_id])
            else:
                alias = recipient_id

            if alias in recipient_results:
                options = recipient_results[alias][0]['options']         # [301, 354, 355, 353, 305]
            else:
                possible_recipients = property_data['results'].keys()
                all_opt = {}
                for pr in possible_recipients:
                    for o in recipient_results[pr][0]['options']:
                        all_opt[o] = 1
                options = list(all_opt.keys())

    debug("Options: ", options)

    fv = formatted_value

    # strip price
    m = re.match('(.*)\[US\$[0-9.]*\]\s*$', fv)
    if m != None:
        fv = m.group(1)
        debug('Price stripped:', fv)

    # strip recip
    m = re.search(RECIPIENT_RE, fv)
    if m != None:
        fv = m.group(1)
        debug('Recipient stripped:', fv)
    else:
        debug('Recipient not found:', fv)

    # find <prefix> value  <postfix>
    value_start = fv.find(value)
    prefix = fv[0:value_start].strip()
    postfix = fv[value_start+len(value):].strip()

    if prefix != '':
        debug('Found prefix:', prefix)
        for o in options:
            debug('Checking option:', o)
            if SCALING_OPTIONS[str(o)] == prefix:
                debug('Found scaling option by prefix:', prefix, o)
                return o
        else:
            return None
    elif postfix != '':
            debug('Found postfix:', postfix)
            # match postfixes to scaling option
            if postfix in SCALING_UNITS:
                debug('Found unit:', postfix, SCALING_UNITS[postfix])
                if SCALING_UNITS[postfix] in options:
                    debug('Found scaling option:', postfix, SCALING_UNITS[postfix])
                    return SCALING_UNITS[postfix]

    elif value in ALPHA_VALUES:
        debug('Found Alpha value:', value)
        if ALPHA_ID in options:
            debug('Found scaling option:', "Alpha", ALPHA_ID)
            return ALPHA_ID

    return


#with open('ps-recip.json') as f:
with open('prop-sets.json') as f:
    prop_set = json.load(f)


#conn = psycopg2.connect("dbname=test_hive_00 user=hive password=H1ve2015 host=hive_db00")
conn = psycopg2.connect("dbname=hive user=hive")
cur_variation_id = conn.cursor()
cur_variation_id.execute("SELECT id from variations")


while True:
    row = cur_variation_id.fetchone()
    if row is None:
        break
    var_id = str(row[0])


    cur_options = conn.cursor()
    cur_options.execute("SELECT o.value, o.formatted_value, v.property_id, p1.property_value as taxonomy_id, p2.property_value as recipient_id, v.scaling_option_id "
    "FROM variation_options o "
    "JOIN variations v ON v.id = o.variation_id "
    "LEFT JOIN (SELECT id, property_value FROM products WHERE property_name = 'taxonomy_id') p1 ON v.product_id = p1.id "
    "LEFT JOIN (SELECT id, property_value FROM products WHERE property_name = 'recipient') p2 ON v.product_id = p2.id "
    "WHERE v.id = " + var_id
    )

    final_scale = None
    scaling_option = None
    while True:
        row = cur_options.fetchone()
        if row is None:
            break
        (value, formatted_value, property_id, taxonomy_id, recipient_id, scaling_option) = row
        debug("value:", value, ", formatted_value:", formatted_value, ", property_id:", property_id, ", taxonomy_id:", taxonomy_id, ", recipient_id:", recipient_id, ", scaling_option:", scaling_option)
        scale = get_scale(value, formatted_value,property_id, taxonomy_id, recipient_id,  prop_set)
        if scale is not None:
            final_scale = scale
            break

    if scaling_option == final_scale:
        print("OK")
    elif final_scale is None:
        print("We have not found it, boon has", var_id)
    else:
        print("ERROR: ", scaling_option, "!=", final_scale, "variation_id:", var_id)

    cur_options.close()


#
#
#SELECT o.value, o.formatted_value, v.property_id, p1.property_value as taxonomy_id, p2.property_value as recipient_id, v.scaling_option_id
#	FROM variation_options o
#		JOIN variations v ON v.id = o.variation_id
#		LEFT JOIN (SELECT id, property_value FROM products WHERE property_name = 'taxonomy_id') p1 ON v.product_id = p1.id
#		LEFT JOIN (SELECT id, property_value FROM products WHERE property_name = 'recipient') p2 ON v.product_id = p2.id
#	WHERE v.property_id = 100;
