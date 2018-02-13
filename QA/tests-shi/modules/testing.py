import operator
from time import sleep
from typing import Any, List


def wait_for_assert(expected_data: Any,
                    function: (),
                    message: str='',
                    retries: int=5,
                    delay_sec: int=1,
                    oper=operator.eq,
                    exceptions: List[Exception]=None,
                    print_data: bool = True):
    """ Function that permits to assert a condition with a timeout

    :param expected_data: Data that are expected in the assert
    :param function: Function that returns data to be compared with expected data
    :param message: Error message for failed assert
    :param retries: Number of retries
    :param delay_sec: Delay between retries in seconds
    :param oper: operator to be used when comparing data
    :param exceptions: exceptions to ignore
    :param print_data: whether to print data to stdout
    """

    for i in range(retries, -1, -1):
        if not exceptions:
            data = function()
        else:
            try:
                data = function()
            except tuple(exceptions):
                sleep(delay_sec)
                continue

        try:
            assert oper(expected_data, data), message
            break
        except AssertionError:
            if i == 0:
                # all retries are used
                if print_data:
                    print('Expected data:', expected_data)
                    print('Operator: ', str(oper))
                    print('Actual data:  ', data)
                raise
        sleep(delay_sec)
    else:
        raise AssertionError('All attempts exhausted (exceptions(s) raised)')
