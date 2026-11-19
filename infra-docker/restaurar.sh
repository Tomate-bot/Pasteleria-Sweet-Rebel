#!/bin/sh
# Se ejecuta una sola vez al crear el contenedor "bd": restaura tu respaldo (respaldo/pasteleria_bd.sql).
pg_restore --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB" /respaldo/pasteleria_bd.sql
