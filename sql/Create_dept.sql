CREATE TABLE departments(
    dept_id NUMBER DEFAULT dept_seq.NEXTVAL PRIMARY KEY,
    dept_name VARCHAR2(100) NOT NULL,
    location VARCHAR2(100),
    phone VARCHAR2(15),
    created_at DATE DEFAULT SYSDATE
);
