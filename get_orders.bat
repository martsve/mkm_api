@echo off

mkdir orders

mkm get orders/2/1 > orders/bought.txt
mkm get orders/2/2 > orders/paid.txt
mkm get orders/2/4 > orders/sent.txt
mkm get orders/2/8 > orders/received.txt
mkm get orders/2/32 > orders/lost.txt
mkm get orders/2/128 > orders/cancelled.txt
