#!/bin/bash

rm -rf hfc-key-store/*
rm -rf latency_stats.csv
node enrollAdmin.js
node registerUser.js
for run in {1..100}; do node performTransaction.js; done