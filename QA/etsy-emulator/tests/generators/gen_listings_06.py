#!/usr/bin/env python3

categories = [
    r'"category_path" : [ "Clothing", "Men", "Socks" ], "category_path_ids" : [ 69150353, 69153053, 68933642 ], "category_id" : 68933642,',
    r'"category_path" : [ "Clothing", "Men", "Pants" ], "category_path_ids" : [ 69150353, 69153053, 69198293 ], "category_id" : 69198293,',
    r'"category_path" : [ "Jewelry", "Necklace" ], "category_path_ids" : [ 68887482, 69151567 ], "category_id" : 69151567,',
    r'"category_path" : [ "Clothing", "Shoes" ], "category_path_ids" : [ 69150353, 68889926 ], "category_id" : 68889926,',
]

tags = [
    r'"tags": ["Tag01"],',
    r'"tags": ["Tag02"],',
    r'"tags": ["Tag03 looong name"],',
    r'"tags": ["Tag04"],',
]

materials = [
    r'"materials": ["wool"],',
    r'"materials": ["cotton"],',
    r'"materials": ["plastic"],',
    r'"materials": ["iron"],',
    r'"materials": ["glass"],',
]

recipients = [
    r'"recipient": "men",',
    r'"recipient": "women",',
    r'"recipient": "unisex_adults",',
    r'"recipient": "teen_boys",',
    r'"recipient": "teen_girls",',
    r'"recipient": "teens",',
    r'"recipient": "boys",',
    r'"recipient": "girls",',
]

occasions = [
    r'"occasion": "anniversary",',
    r'"occasion": "birthday",',
    r'"occasion": "christmas",',
    r'"occasion": "easter",',
    r'"occasion": "wedding",',
]

styles = [
    r'"style": ["Geek", "Sport"],',
    r'"style": ["Geek", null],',
    r'"style": ["Sport", "Formal"],',
    r'"style": ["Punk", "Sport"],',
]

titles = '"title": "Best gadget '

descriptions = [
    r'"First line\nSecond line\nThird line\nForth line\nFifth line\n"',
    r'"First line\r\nSecond line\r\nThird line\nForth line\r\nFifth line\n"',
    r'"First line\nSecond line\r\nThird line\nForth line\nFifth line\n"',
]

def print_json(listing_id, title, description, category, tag, material, recipient, occasion, style):
    full_listing_id = '"listing_id": ' + str(listing_id) + ','
    full_title = '"title": "' + title + '",'
    json = r'{ "pagination" : {}, "type" : "Listing", "results" : [' + \
        '{' + full_listing_id + full_title + category + tag + material + recipient + occasion + style + \
        r' "non_taxable" : false, "file_data" : "", "used_manufacturer" : false, "ending_tsz" : 1460803506, "shipping_template_id" : null, "who_made" : "i_did", "processing_max" : null, "original_creation_tsz" : 1450266306, "item_length" : null, "state" : "active", "Section" : null, "description" : '+ description + r', "Variations" : [ { "property_id" : 200, "formatted_name" : "Color", "options" : [ { "is_available" : true, "price_diff" : 0, "value" : "Blue", "formatted_value" : "Blue", "price" : 5.15, "value_id" : 1166197768 }, { "is_available" : true, "price_diff" : 0, "value" : "Green", "formatted_value" : "Green", "price" : 5.15, "value_id" : 1166197772 }, { "value_id" : 1166197782, "price" : 5.15, "formatted_value" : "Red", "value" : "Red", "price_diff" : 0, "is_available" : true } ] }, { "formatted_name" : "Fabric", "options" : [ { "value" : "wool", "is_available" : true, "price_diff" : 0, "value_id" : 2723346448, "price" : 5.15, "formatted_value" : "wool" }, { "formatted_value" : "cotton", "price" : 5.15, "value_id" : 2726396058, "is_available" : true, "price_diff" : 0, "value" : "cotton" } ], "property_id" : 502 } ], "last_modified_tsz" : 1450269283, "is_private" : false, "processing_min" : null, "should_auto_renew" : "false", "url" : "https://www.etsy.com/listing/260850358/nothing-to-see-here2?utm_source=etsytestapp&utm_medium=api&utm_campaign=api", "quantity" : 1, "Shop" : { "num_favorers" : 0, "first_line" : null, "country_id" : null, "upcoming_local_event_id" : null, "policy_payment" : null, "user_id" : 75630222, "zip" : null, "icon_url_fullxfull" : null, "lon" : 0, "city" : "", "currency_code" : "CZK", "is_vacation" : false, "vacation_autoreply" : null, "sale_message" : null, "shop_id" : 8545731, "announcement" : null, "ga_code" : "", "image_url_760x100" : null, "creation_tsz" : 1447096079, "shop_name" : "EtsyTestAppShop", "policy_seller_info" : null, "policy_refunds" : null, "second_line" : null, "languages" : [ "en-US" ], "name" : null, "policy_updated_tsz" : 0, "login_name" : "jirkat", "state" : "", "digital_sale_message" : null, "accepts_custom_requests" : false, "last_updated_tsz" : 1447096993, "title" : null, "vacation_message" : null, "policy_shipping" : null, "policy_welcome" : null, "lat" : 0, "policy_additional" : null, "url" : "https://www.etsy.com/shop/EtsyTestAppShop?utm_source=etsytestapp&utm_medium=api&utm_campaign=api", "listing_active_count" : 0 }, "language" : "en-US", "is_supply" : "false", "item_width" : null, "num_favorers" : 0, "featured_rank" : null, "when_made" : "before_1996", "taxonomy_id" : 1490, "state_tsz" : 1450266306, "taxonomy_path" : [ "Shoes", "Unisex Adult Shoes", "Boots", "Walking & Hiking Boots" ], "Translations" : [ { ' + \
        full_title + tag + full_listing_id + \
        r' "description" : "invisible gloves", "language" : "en-US" } ], "price" : "5.15", "user_id" : 75630222, "Manufacturers" : [], "has_variations" : true, "Images" : [ { "green" : 230, "brightness" : 98, "creation_tsz" : 1450266306, "url_170x135" : "https://img0.etsystatic.com/110/0/11980898/il_170x135.865542738_jgog.jpg", "red" : 251, "rank" : 1, ' + \
        full_listing_id + \
        r'"blue" : 231, "hex_code" : "FBE6E7", "hue" : 357, "url_fullxfull" : "https://img0.etsystatic.com/110/0/11980898/il_fullxfull.865542738_jgog.jpg", "full_height" : 73, "is_black_and_white" : false, "listing_image_id" : 865542738, "url_570xN" : "https://img0.etsystatic.com/110/0/11980898/il_570xN.865542738_jgog.jpg", "saturation" : 8, "url_75x75" : "https://img0.etsystatic.com/110/0/11980898/il_75x75.865542738_jgog.jpg", "full_width" : 84 } ], "currency_code" : "CZK", "item_dimensions_unit" : null, "User" : { "feedback_info" : { "count" : 0, "score" : null }, "user_pub_key" : { "key_id" : 35096681328, "key" : "-----BEGIN PUBLIC KEY-----\nMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAzkpPdnmSfq89ItFXKgPv\nnyEmdcbESSRqrLT4Dag18kLMz0Q/nP7pi3Uke6Le5TU/oWbdyTSxZO6FrtqdjtJr\nNsxq67Gg3rX88AdU6FF3JJxRoxbywEaN0oV6CVR6NKvmCnakPQsgQpxs6su2O4IF\nA5uqE2DuFa+0iDA4NmB7kfK5jURjDx74vBpf1tRYLZ+2/TyPGL0LFXDlunovprOM\nGJ3QeKAPJfWAZ3xU+pYc2B7TsNI82u3LPQudhC1mRKYuc0ObtMH8inNKeMGuEJ3q\n6lJW+/bpjD+XpOA/ehm9l4hzJW1GwYdiKBqqtQpzBbFZgRE6kmuJ7Asu6BtL4Na2\ntZlaqpBAURjFKcFO0YBQUzJAAOQQhwPZyedFIFqxOI+9SDcEMgCrxnZJZI9zqYJL\nAHrP0KtWEyIZgri9O2mb4gw5zthm24DdXiqHUiYbRoK419Qcn+f+63/H7Ttn4rJy\n/yPAz0YV9gEwmgSMDon6OIPlD+iczolb8szrLDGVdwiHT5N8/Hc8VB/L4cw1Nqru\nTZdNP0vG0cEnOl3J+yJaisjxfKrXwIFRMFwMmfNWwgaUYtvzYNo5JINQNpAZVMAa\nBgJv7LTCjKhLloXYl89el+blGs2ALkIy3zTy3sP2NaZ6/82gDlLKgsJoufg3LWmJ\nmhg3KJG5ShjDQyx4voOdN8UCAwEAAQ==\n-----END PUBLIC KEY-----\n" }, "primary_email" : "tomasj@salsitasoft.com", "awaiting_feedback_count" : 0, "referred_by_user_id" : null, "user_id" : 75630222, "login_name" : "jirkat", "creation_tsz" : 1446888652 }, "item_weight" : null, "shop_section_id" : null, "is_customizable" : false, "is_digital" : false, "MainImage" : { "green" : null, "creation_tsz" : null, "brightness" : null, "url_170x135" : "https://img0.etsystatic.com/110/0/11980898/il_170x135.865542738_jgog.jpg", "red" : null, "url_fullxfull" : "https://img0.etsystatic.com/110/0/11980898/il_fullxfull.865542738_jgog.jpg", "hex_code" : null, "hue" : null, "rank" : null, ' + \
        full_listing_id + \
        r'"blue" : null, "full_height" : null, "is_black_and_white" : null, "listing_image_id" : 865542738, "url_75x75" : "https://img0.etsystatic.com/110/0/11980898/il_75x75.865542738_jgog.jpg", "full_width" : null, "saturation" : null, "url_570xN" : "https://img0.etsystatic.com/110/0/11980898/il_570xN.865542738_jgog.jpg" }, "creation_tsz" : 1450266306, "item_weight_units" : null, "item_height" : null, "views" : 0 }' + \
        r'], "params" : { "listing_id" : "' + str(listing_id) + '" }, "count" : 1 }'
    print(json)




print_json(100001, 'First something 1234',    descriptions[0], categories[0], tags[0], materials[0], recipients[0], occasions[0], styles[0])
print_json(100002, 'Second something 1235',   descriptions[1], categories[0], tags[0], materials[1], recipients[0], occasions[0], styles[0])
print_json(100003, 'Third something LG-512a', descriptions[2], categories[1], tags[0], materials[1], recipients[0], occasions[0], styles[0])
print_json(100004, 'Forth something 123456',  descriptions[0], categories[2], tags[1], materials[2], recipients[0], occasions[0], styles[0])
print_json(100005, 'Fifth something',         descriptions[1], categories[3], tags[1], materials[3], recipients[0], occasions[0], styles[0])
print_json(100006, 'Sixth something',         descriptions[2], categories[3], tags[2], materials[3], recipients[0], occasions[0], styles[0])

