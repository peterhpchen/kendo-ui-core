#!/usr/bin/env bash
grep -rPo 'dialogs.register\("(.+)"' src/spreadsheet | cut -d'"' -f2 | sort > ./build/dialogs.current
diff ./build/dialogs.list ./build/dialogs.current