#!/bin/bash

mkdir -p dist/actions
for f in $(ls src/actions/) ; do
	action="${f%.ts}"
	ncc build -t src/actions/$f -o dist/actions/$action
done
