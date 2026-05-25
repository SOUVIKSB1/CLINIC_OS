CREATE TABLE notifications (
    notification_id NUMBER PRIMARY KEY,
    user_id NUMBER NOT NULL,
    title VARCHAR2(200),
    message VARCHAR2(1000),
    is_read CHAR(1) DEFAULT 'N',
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id),
    CONSTRAINT chk_notification_read
    CHECK (
        is_read IN ('Y', 'N')
    )
);
