package com.ketoan.repository;

import org.apache.commons.dbutils.BasicRowProcessor;
import org.apache.commons.dbutils.BeanProcessor;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

public class SnakeCaseRowProcessor extends BasicRowProcessor {

    public SnakeCaseRowProcessor() {
        super(new SnakeCaseBeanProcessor());
    }

    private static class SnakeCaseBeanProcessor extends BeanProcessor {
        @Override
        protected int[] mapColumnsToProperties(ResultSetMetaData rsmd,
                                                java.beans.PropertyDescriptor[] props) throws SQLException {
            int cols = rsmd.getColumnCount();
            int[] columnToProperty = new int[cols + 1];
            java.util.Arrays.fill(columnToProperty, PROPERTY_NOT_FOUND);

            for (int col = 1; col <= cols; col++) {
                String columnName = rsmd.getColumnLabel(col);
                String camelCase = toCamelCase(columnName);
                for (int i = 0; i < props.length; i++) {
                    if (camelCase.equalsIgnoreCase(props[i].getName())) {
                        columnToProperty[col] = i;
                        break;
                    }
                }
            }
            return columnToProperty;
        }

        private String toCamelCase(String snake) {
            StringBuilder sb = new StringBuilder();
            boolean upperNext = false;
            for (char c : snake.toCharArray()) {
                if (c == '_') {
                    upperNext = true;
                } else {
                    sb.append(upperNext ? Character.toUpperCase(c) : c);
                    upperNext = false;
                }
            }
            return sb.toString();
        }
    }
}