CREATE TABLE payments (
    payment_id NUMBER PRIMARY KEY,
    bill_id NUMBER NOT NULL,
    amount NUMBER(10,2) NOT NULL,
    payment_method VARCHAR2(30),
    payment_date DATE DEFAULT SYSDATE,
    transaction_ref VARCHAR2(100),
    CONSTRAINT fk_payment_bill
    FOREIGN KEY (bill_id)
    REFERENCES bills(bill_id)
);
