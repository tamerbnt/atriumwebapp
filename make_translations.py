#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re

with open('pm_keys_dump.json', 'r', encoding='utf-8') as f:
    pm_data = json.load(f)

print(f"Total keys: {len(pm_data)}")
