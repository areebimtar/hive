import operator
from time import sleep
from typing import Any, Union, Tuple

from selenium.common.exceptions import WebDriverException
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.remote.webdriver import WebDriver


from modules.testing import wait_for_assert

Locator = Tuple[str, str]


def send_keys(element: WebElement, s: str):
    element.send_keys(s[0:-1])
    sleep(0.5)
    element.send_keys(s[-1])
    sleep(0.5)


def click(element: WebElement=None,
          element_parent: Union[None, WebDriver, WebElement]=None,
          locator: Locator=None,
          delay: Union[int, float]=None):
    """ Clicks on element. Repeats when it fails

    It is possible to provide element object directly or its parent object and locator.
    :param element: WebElement - if present, directly click on this WebElement
    :param element_parent: WebElement - if present first find the element to click on under this element/WebDriver
        object using locator parameter
    :param locator: locator tuple i.e. (By.CSS_SELECTOR, 'div.my-class')
    :param delay: optional delay between attempts
    """
    for i in range(3, -1, -1):
        if locator and element_parent:
            try:
                element = element_parent.find_element(*locator)
            except WebDriverException as e:
                if i == 0:
                    raise
                print("ERROR: cannot find element", e.args)
                sleep(0.5)
                continue

        if not element.is_displayed():
            if i == 0:
                raise Exception('Element is not displayed')
            else:
                print('ERROR: element is not displayed')
                sleep(0.5)
                continue
        if not element.is_enabled():
            if i == 0:
                raise Exception('Element is not enabled')
            else:
                print('ERROR: element is not enabled')
                sleep(0.5)
                continue

        try:
            sleep(0.5)
            element.click()
            if delay is not None:
                sleep(delay)
            break
        except WebDriverException as e:
            if i == 0:
                raise
            print("ERROR: cannot click on element", e.args)


def wait_for_web_assert(expected_data: Any,
                        function: (),
                        message: str='',
                        retries: int=5,
                        delay_sec: int=1,
                        oper=operator.eq):
    """ Function that permits to assert a condition with a timeout. Ignores WedDriver exceptions.

    :param expected_data: Data that are expected in the assert
    :param function: Function that returns data to be compared with expected data
    :param message: Error message for failed assert
    :param retries: Number of retries
    :param delay_sec: Delay between retries in seconds
    :param oper: operator to be used when comparing data
    """

    wait_for_assert(expected_data,
                    function,
                    message=message,
                    retries=retries,
                    delay_sec=delay_sec,
                    oper=oper,
                    exceptions=[WebDriverException])
