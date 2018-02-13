#!/bin/bash -x

# Creates TLS/SSL keys and certificates for testing purpose.
# Primarily it creates the self-signed certificate for https.
#
# In production, custom keys and certificates are expected to be provided.
# The file system paths to these files are set in src/server/config.json.
# xxx: after yarn install script is run to update paths in dist?

# Copy keys and certificates to this directory.
dst="dist/auth/server/cert"

init()
{
    # Do not create keys and certificates every time yarn install is run.
    if [ -d "$dst" ]; then
        exit 0;
    fi
    if [ -e "$dst" ]; then
        echo "Error: $dst exists but it is not a directory"
        ls -l $dst
        exit 1
    fi
    mkdir -p "$dst"

    # http://www.akadia.com/services/ssh_test_certificate.html

    rm -f private_key.rsa   # Private key.
    rm -f public_key.rsa    # Private key.
    rm -f server.csr        # Certificate signing request.
    rm -f server.crt        # Self-signed certificate.
}

generate_private_key()
{
    openssl genrsa -out private_key.rsa 2048
}

# Once the private is generated a Certificate Signing Request can be generated.
# The CSR is then used in one of two ways. Ideally, the CSR will be sent
# to a Certificate Authority, such as Thawte or Verisign who will verify
# the identity of the requestor and issue a signed certificate.
# The second option is to self-sign the CSR, which will be demonstrated
# in the next section.
#
generate_certificate_signing_request()
{
expect <<'EOF'
set timeout 30
spawn openssl req -new -key private_key.rsa -out server.csr

expect {
    "Country Name"             { send "CZ\n"; exp_continue }
    "State or Province Name"   { send "Czech Republic\n"; exp_continue }
    "Locality Name"            { send "Prague\n"; exp_continue }
    "Organization Name"        { send "Salsita Software Ltd\n"; exp_continue }
    "Organizational Unit Name" { send "Hive\n"; exp_continue}
    "Common Name"              { send "Tomas Klacko\n"; exp_continue}
    "Email Address" { send "tomas.klacko@salsitasoft.com\n"; exp_continue}
    "A challenge password"     { send ".\n"; exp_continue }
    "An optional company name" { send ".\n"; exp_continue }
    timeout { exit 1; }
}

exit 0
EOF
if [ $? -ne 0 ]; then
    exit 1
fi
}

create_self_signed_certificate()
{
    openssl x509 -req -days 14 \
        -in server.csr -signkey private_key.rsa -out server.crt
}

# The public key is used by the test server to verify the JWT
# created by the auth server.
#
create_public_key()
{
    openssl rsa -in private_key.rsa -pubout > public_key.rsa
}

move_files()
{
    mv private_key.rsa "$dst" || exit 1
    mv public_key.rsa "$dst" || exit 1
    mv server.csr "$dst" || exit 1
    mv server.crt "$dst" || exit 1
    ls -l "$dst" || exit 1
}

main()
{
    init
    generate_private_key
    generate_certificate_signing_request
    create_self_signed_certificate
    create_public_key
    move_files
    exit 0
}

main "$@"

