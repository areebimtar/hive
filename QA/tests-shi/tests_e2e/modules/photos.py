import os
import re
import shutil
import subprocess
from subprocess import call
from tempfile import mkdtemp

import requests

from modules.http import format_http_response


def compare_images(image_urls, expected_images_info):
    assert len(image_urls) == 2, "2 uploaded images expected"
    photo_dir = mkdtemp(prefix='qa-', dir='/tmp')
    img_path = os.path.join(photo_dir, 'img.jpg')

    try:
        for i, img_url in enumerate(image_urls):
            response = requests.get(img_url)
            assert response.status_code == 200, format_http_response(response)

            with open(img_path, 'wb') as f:
                f.write(response.content)
                f.close()
            img_size = subprocess.getoutput('convert ' + img_path + ' -format "%w x %h" info:')
            assert img_size == expected_images_info[i]['size']
    finally:
        shutil.rmtree(photo_dir, ignore_errors=True)


class Photos(object):

    def __enter__(self):
        self.photo_dir = mkdtemp(prefix='qa-', dir='/tmp')
        returncode = call(['sh', '-c', 'cp -r qa-img/* ' + self.photo_dir])
        if returncode != 0:
            raise Exception("Error: copy script failed")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        shutil.rmtree(self.photo_dir, ignore_errors=True)

    def __init__(self, driver):
        self.driver = driver

    def bulk_photo_elements(self):
        return self.driver.find_elements_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--actions-photos div.bulk-edit--actionform div.photo')

    def get_display_style(self, element):
        style = element.get_attribute('style')
        m = re.match('display: ([a-z]*)', style)
        if m:
            return m.group(1)
        return ''

    def set_display_style(self, element, style):
        self.driver.execute_script("arguments[0].style.display = '" + style + "'", element)

    def select_image(self, photo_elem, img_path):
        file_input = photo_elem.find_element_by_xpath(".//input[@type='file']")
        orig_style = self.get_display_style(file_input)
        self.set_display_style(file_input, 'inline')
        self.driver.execute_script("arguments[0].value = ''", file_input)
        file_input.send_keys(img_path)
        self.set_display_style(file_input, orig_style)

    def select_photo(self, index, img_path):
        photos = self.bulk_photo_elements()
        self.select_image(photos[index], img_path)
