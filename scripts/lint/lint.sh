#!/bin/sh

nomatch="-1";
name="GraceNode";
cwd=`pwd`;

indexOf() {
	pos="${1%%$2*}";
	[[ $pos = $1 ]] && echo -1 || echo ${#pos};
}

# find root path
index=`indexOf "$cwd" "$name"`;
if [ "$index" -ne -1 ]; then
	path=`expr substr $cwd 1 $index`"$name/";
else 
	path="./";
fi 

echo "Execute jshint...";

echo "Current working directory: $cwd";

echo "Root path: $path";

#################
# lint index.js
#################
echo "linting "$path"index.js";

failed=`jshint "$path"index.js`;

if [ "$failed" ]; then
	echo "*** [error] lint error(s) in core directory";
	echo $failed;
	exit 1;
else
	echo "Passed OK";
fi

#############
# lint core/
#############
echo "linting "$path"core/";

failed=`jshint "$path"core/`;

if [ "$failed" ]; then
	echo "*** [error] lint error(s) in core directory";
	echo $failed;
	exit 1;
else
	echo "Passed OK";
fi

##################
# lint modules/
##################
echo "liniting "$path"modules/";

failed=`jshint "$path"modules/`;

if [ "$failed" ]; then
	echo "*** [ERROR] lint error(s) in core directory";
	echo $failed;
	exit 1;
else
	echo "Passed OK";
fi

#################
# lint lib/
#################
echo "linting "$path"lib/";

failed=`jshint "$path"lib/`;

if [ "$failed" ]; then
	echo "*** [error] lint error(s) in core directory";
	echo $failed;
	exit 1;
else
	echo "Passed OK";
fi

echo "Done";

exit 0;