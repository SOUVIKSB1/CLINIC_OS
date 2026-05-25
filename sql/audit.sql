CREATE TABLE audit_logs (
    log_id NUMBER PRIMARY KEY,
    user_id NUMBER,
    action VARCHAR2(100),
    entity_name VARCHAR2(100),
    created_at DATE DEFAULT SYSDATE
);
