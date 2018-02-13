def print_http_response(response):
    print(format_http_response(response))


def format_http_response(response):
    s = "HTTP RESPONSE\nStatus-code:\t" + str(response.status_code) + "\n"
    for n, v in response.headers.items():
        s += "\t" + n + "\t" + v + "\n"
    s += "\n" + response.text + "\n"
    return s
