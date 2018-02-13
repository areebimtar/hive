#!/usr/bin/perl
# sum latency for each threadName loop
# timeStamp,elapsed,label,responseCode,threadName,success,bytes,grpThreads,allThreads,Latency,SampleCount,ErrorCount,Connect
# 1461837772337,1988,01 /,200,Thread Group 1-1,true,915,100,100,877,1,0,709
#
# 34 /logout
#
use strict;
use warnings;

my $LAST_LABEL = '34 /logout';
my %threads;


while (my $l = <>) {
	if ($. == 1) {
		print $l;
		next;
	}
	$l =~ s/[\n\r]*$//;
	my ($timeStamp, $elapsed, $label, $responseCode, $threadName, $success, $bytes, $grpThreads, $allThreads, $Latency, $SampleCount, $ErrorCount, $Connect) = split /,/, $l;
	my ($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst) = gmtime($timeStamp / 1000);
	my $time = sprintf "%02d/%02d/%04d %02d:%02d:%02d", $mon + 1, $mday, $year + 1900 , $hour, $min, $sec;
	
	if (exists $threads{$threadName}) {
		my $t = $threads{$threadName};
		$t->{'bytes'} += $bytes;
		$t->{'Latency'} += $Latency;
		$t->{'elapsed'} += $elapsed;
		if ($label eq $LAST_LABEL) {
			print join ",",  @$t{qw/time elapsed label responseCode threadName success bytes grpThreads allThreads Latency SampleCount ErrorCount Connect/};
			print "\n";
			delete $threads{$threadName};
		}
	} else {
		$threads{$threadName} = {
			time => $time,
			elapsed => $elapsed,
			label => $label,
			responseCode => $responseCode,
			threadName => $threadName,
			success => $success,
			bytes => $bytes,
			grpThreads => $grpThreads,
			allThreads => $allThreads,
			Latency => $Latency,
			SampleCount => $SampleCount,
			ErrorCount => $ErrorCount,
			Connect => $Connect,
		}
	}
}

