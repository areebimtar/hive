#!/usr/bin/env python3
# Merge results from several shishito instances into 1, generate html files, upload statistics to qastats
#
#  Env variables for QAStats (if --qastats is used)
#   mandatory: QASTATS_PROJECT_ID   QASTATS_URL   QASTATS_USER   QASTATS_PASSWORD
#   optional: QA_BRANCH_TO_TEST   QA_GIT_COMMIT   QA_BUILD_ID


import glob
import sys, os
import xml.etree.ElementTree as ET
from jinja2 import Template, Environment, FileSystemLoader
from cgi import escape
import argparse
import re
import time
import json
import requests

XFAIL_MSG = 'expected test failure'
XPASS_MSG = 'xfail-marked test passes unexpectedly'
SCREENSHOT_DIR = 'screenshots'
SCREENSHOT_EXT = '.png'
PROG = os.path.basename(__file__)

# Result codes
class R:
        SUCCESS = 'success'
        FAILURE = 'failure'
        ERROR = 'error'
        SKIPPED = 'skipped'
        XFAIL = 'xfail'
        XPASS = 'xpass'


def get_xunit_test_cases(result_path, test_results):
    """ Parses test names and results from xUnit result file
    """

    RESULT_COUNT_MAP = {
        R.SUCCESS: R.SUCCESS,
        R.FAILURE: R.FAILURE,
        R.ERROR:   R.ERROR,
        R.SKIPPED: R.SKIPPED,
        R.XFAIL:   R.SUCCESS,   # test failure was expected
        R.XPASS:   R.FAILURE,   # it passed and should not have
    }
    files = glob.glob(os.path.join(result_path, '*.xml'))
    if files == []:
        return
    if not 'browsers' in test_results:
        test_results['browsers'] = {}

    for result_file in files:
        print("processing file", result_file)
        browser_name = os.path.basename(result_file);
        tree = ET.parse(result_file)
        root = tree.getroot()
        for child in root:
            if child.tag == 'testcase':
                test_case_name = child.get('name')
                if test_case_name is None:
                    continue
                test_case_class = child.get('classname')
                duration = round(float(child.get('time')))
                screenshot_fname = os.path.join(result_path, SCREENSHOT_DIR, test_case_name + SCREENSHOT_EXT)
                result = R.SUCCESS
                failure_message = ''
                for subChild in child:
                    if failure_message != '': failure_message += '\n'
                    if not subChild.text is None: failure_message += subChild.text
                    if subChild.tag == 'failure':
                        result = R.FAILURE
                    elif subChild.tag == 'error':
                        result = R.ERROR
                    elif subChild.tag == 'skipped':
                        result = R.SKIPPED
                        skipeType = subChild.attrib.get('type')
                        if skipeType is None:
                            msg = subChild.attrib.get('message')
                            if not msg is None:
                                if (msg == XFAIL_MSG):
                                    result = R.XFAIL
                                elif (msg == XPASS_MSG):
                                    result = R.XPASS

                entry = {
                    'name': test_case_name,
                    'classname': test_case_class,
                    'duration': duration,
                    'result': result
                }
                if result != 'success':
                    entry['failure_message'] = failure_message
                    if os.path.isfile(screenshot_fname):
                        entry['screenshot'] = os.path.basename(screenshot_fname)

                if not browser_name in test_results['browsers']:
                    test_results['browsers'][browser_name] = { 'test_cases': [], 'stats': { R.SUCCESS: 0, R.SKIPPED: 0, R.FAILURE: 0, R.ERROR: 0 } }
                test_results['browsers'][browser_name]['test_cases'].append(entry)
                test_results['browsers'][browser_name]['stats'][ RESULT_COUNT_MAP[result] ] += 1


def generate_merged_html(target_dir, elapsed_time, test_results):
        # Get html template
    jinja_env = Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')))
    template = jinja_env.get_template('test_results.html')

        # Generate merged html files for each <browser>.xml
    for browser, browser_results in test_results['browsers'].items():
        html = template.render(
            datetime = time.strftime("%d-%b-%Y at %H:%M:%S"),
            test_cases = browser_results['test_cases'],
            stats = {
                'all': len(browser_results['test_cases']),
                'passed': browser_results['stats'][R.SUCCESS],
                'skipped': browser_results['stats'][R.SKIPPED],
                'failed': browser_results['stats'][R.FAILURE],
                'errors': browser_results['stats'][R.ERROR],
            },
            test_run_time = args.elapsed_time,
        )

        target_fname = os.path.join(target_dir, re.sub(r'\.xml$', '.html', browser))
        os.makedirs(target_dir, exist_ok=True)
        with open(target_fname, 'w') as f:
            print("Saving merged test results:", target_fname)
            f.write(html)


def upload_qastats(test_results, env_vars):
        """ Create test-cases on QAStats, adds a new test run and update results for the run 
            {
               "project_id": 123,
               "timestamp": 1470133472,
               "build": "773",              // optional
               "environment": "Firefox"     // optional
               "branch": "develop",         // optional
               "git": "ae232a",             // optional
               "results": [
                  { "test": "test_login", "result": "pass" },   // [pass fail err nr]
                  ...
               ],
            }
        """
        STATUS_MAP = {
            R.SUCCESS: 'pass',
            R.FAILURE: 'fail',
            R.XFAIL:   'pass',
            R.XPASS:   'fail',
            R.ERROR:   'err',
            R.SKIPPED: 'nr'
        }

            # QAStats vars:
        project_id = env_vars['QASTATS_PROJECT_ID']
        qas_url = env_vars['QASTATS_URL'] + '/api/v1/results'
        qas_user = env_vars['QASTATS_USER']
        qas_pass = env_vars['QASTATS_PASSWORD']
            # optional vars
        git_branch = env_vars['QA_BRANCH_TO_TEST'] if 'QA_BRANCH_TO_TEST' in env_vars else None
        git_commit = env_vars['QA_GIT_COMMIT'] if 'QA_GIT_COMMIT' in env_vars else None
        build_id = env_vars['QA_BUILD_ID'] if 'QA_BUILD_ID' in env_vars else None
        
        timestamp = int(time.time())

        for (browser, data) in test_results['browsers'].items():
            timestamp += 1
            m =re.match('^(.*)\.xml$', browser)
            if m != None: browser = m.group(1)

            payload = {
                    'project_id': project_id,
                    'timestamp': timestamp,
                    'environment': browser,
            }
            if build_id   is not None: payload['build'] = build_id
            if git_branch is not None: payload['branch'] = git_branch
            if git_commit is not None: payload['git'] = git_commit

            results = [ {'test': t['name'], 'result': STATUS_MAP[t['result']]} for t in data['test_cases'] ]
            payload['results'] = results
            json_payload = json.dumps(payload)


            r = {}
            try:
                print("Uploading results to", qas_url)
                r = requests.post(qas_url, auth=(qas_user, qas_pass), data=json_payload, headers={'Content-Type': 'application/json'})

                if r.status_code == requests.codes.ok:
                    resp = r.json()
                    if 'result' in resp and resp['result'] == 'OK':
                        return True
            except Exception as e:
                print('ERROR:', e)
                pass

            print('r=', r)
            print("Error: uploading tests to QAStats\n\n", json_payload, "\n")
            if r.status_code:
                print("\tStatus-code:\t" + str(r.status_code) + "\n")
                for n, v in r.headers.items():
                    print("\t" + n + "\t" + v)
                print("")
                print(r.text)
            exit(1)



#--------------------------------------------------------------------------------

parser = argparse.ArgumentParser()
parser.add_argument("--source-dirs", nargs='+', required=True)
parser.add_argument("--target-dir", required=True)
parser.add_argument("--elapsed-time", default='')
parser.add_argument("--qastats", action="store_true")

args = parser.parse_args()



    # Read all xml result files in all source dirs, store result in test_results
test_results = {}
for arg in args.source_dirs:
    get_xunit_test_cases(arg, test_results)

    # Generate merged <browser>.html files
if test_results == {}:
    print("WARNING: No PyTest XML files found in", args.source_dirs)
else:
    generate_merged_html(args.target_dir, args.elapsed_time, test_results)

        # Upload statistics to qastats if required
    if args.qastats:
            # check the required variables
        for v in ['QASTATS_PROJECT_ID', 'QASTATS_URL', 'QASTATS_USER', 'QASTATS_PASSWORD']:
            if not v in os.environ:
                print("ERROR: required enviroment variable", v, "is not set")
                exit(1)
        upload_qastats(test_results, os.environ)
