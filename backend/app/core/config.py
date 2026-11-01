import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AquaGuard - Smart Water Quality Monitoring System"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "aquaguard-super-secure-production-secret-key-change-in-prod-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    # Default to local SQLite database if PostgreSQL is not specified
    DATABASE_URL: str = "sqlite:///./aquaguard.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # MQTT Broker Configuration
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_KEEPALIVE: int = 60
    MQTT_TOPIC_PREFIX: str = "aquaguard"
    MQTT_ENABLED: bool = False
    
    # Simulation Engine Configuration
    SIMULATION_ENABLED_DEFAULT: bool = True
    SIMULATION_INTERVAL_SECONDS: int = 3
    
    # Notifications (Mock / SMTP)
    SMTP_SERVER: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "alerts@aquaguard.io"
    
    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
