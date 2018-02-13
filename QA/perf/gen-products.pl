#!/usr/bin/env perl
$DOC="
generate CSV data for jmeter load test
e.g.:
	./gen-products.pl 500 data
";

my $PROD_COUNT = 200;
my $SHOP_PROD_COUNT = 500;

sub generate_data($$)
{
	my ($usr_count, $data_dir) = @_;

	for my $i (0..$usr_count-1) {
		my $get_products = '';
		my $put_products = '';
		for my $j (1..$PROD_COUNT) {
			my $prod = $SHOP_PROD_COUNT * $i + $j;
			$get_products .= ( ($j == 1) ? "$prod" : ",$prod");
			$put_products .= ( ($j == 1) ? "\"$prod\"" : ",\"$prod\"");
		}
		my $user_no = $i + 1;

		my $fname = "$data_dir/data-$user_no.csv";
		open(my $fd, ">", $fname) or die "cannot open $fname ($!)\n";
		print($fd  "$user_no\tuser$user_no\t$get_products\t$put_products\n");
		close($fd);
	}
}


if (@ARGV != 2 or $ARGV[0] eq '-h' or $ARGV[0] !~ /^\d+/) { print "$DOC\nUsage: $0 <number-of-users>\n"; exit 1 }
my ($usr_count, $data_dir) = @ARGV;

generate_data($usr_count, $data_dir);
