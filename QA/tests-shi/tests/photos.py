    def get_display_style(self, element):
        style = element.get_attribute('style')
        m = re.match('display: ([a-z]*)', style)
        if m != None:
            return m.group(1)
        return ''
            
    def set_display_style(self, element, style):
        self.driver.execute_script("arguments[0].style.display = '" + style + "'", element)


    def bulk_photo_elements(self):
        return self.driver.find_elements_by_css_selector('bulk-edit-dashboard--content div.bulk-edit--actions-photos div.bulk-edit--actionform div.photo')

    def row_photo_elements(self, row):
        return row.find_elements_by_css_selector('div.photo')

    def select_image(self, photo_elem, img_path):
        file_input = photo_elem.find_element_by_xpath("//input[@type='file']")
        orig_style = self.get_display_style(file_input)
        self.set_display_style(file_input, 'inline')
        file_input.send_keys(img_path)
        self.set_display_style(file_input, orig_style)


    def add_photo(self, index, img_path):
        photos = self.bulk_photo_elements()
        self.select_image(photos[index], img_path)

