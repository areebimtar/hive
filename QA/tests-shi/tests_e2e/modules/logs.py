from subprocess import call, getstatusoutput


def log(*args):
    print("*** ", *args)


class Logs(object):
    def __init__(self, clean_logs_command, grep_logs_command):
        self.clean_logs_command = clean_logs_command
        self.grep_logs_command = grep_logs_command

    def empty(self):
        returncode = call(['/bin/bash', '-c', self.clean_logs_command])
        assert returncode == 0, "Clean logs command failed"

    def check_for_errors(self):
        returncode, output = getstatusoutput(self.grep_logs_command)
        assert returncode in [0, 1], "Grep logs command failed\n" + output
        if output != "":
            log("Errors found in logs")
            print(output)