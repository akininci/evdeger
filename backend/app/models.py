"""
EvDeğer — SQLAlchemy Modelleri
Veritabanı tabloları: listings, valuations, users, searches, subscribers.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Listing(Base):
    """İlan verileri — sahibinden, hepsiemlak, emlakjet gibi kaynaklardan."""

    __tablename__ = "listings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, comment="sahibinden, hepsiemlak, emlakjet")
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    listing_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="sale, rent")
    property_type: Mapped[str] = mapped_column(String(50), default="apartment")
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    neighborhood: Mapped[str] = mapped_column(String(200), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="TRY")
    sqm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    rooms: Mapped[str | None] = mapped_column(String(20), nullable=True, comment="2+1, 3+1, vb.")
    floor_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_floors: Mapped[int | None] = mapped_column(Integer, nullable=True)
    building_age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    has_elevator: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    has_parking: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    heating_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(10, 7), nullable=True)
    listing_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    scraped_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    listed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    raw_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        Index("idx_listings_location", "city", "district", "neighborhood"),
        Index("idx_listings_type", "listing_type", "property_type"),
        Index("idx_listings_price", "price"),
        Index("idx_listings_source", "source", "source_id", unique=True),
    )


class Valuation(Base):
    """Değerleme sonuçları — mahalle bazlı hesaplanmış m² fiyatları."""

    __tablename__ = "valuations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    neighborhood: Mapped[str] = mapped_column(String(200), nullable=False)
    avg_price_per_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    median_price_per_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    min_price_per_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    max_price_per_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    avg_rent_per_sqm: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    sample_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    yoy_change: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True, comment="Yıllık değişim %")
    calculated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    listing_type: Mapped[str] = mapped_column(String(20), nullable=False, comment="sale, rent")

    __table_args__ = (
        Index("idx_valuations_location", "city", "district", "neighborhood"),
    )


class User(Base):
    """Kullanıcılar — email ile kayıt."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    search_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Subscriber(Base):
    """Email aboneleri — aylık ev değeri raporu için."""

    __tablename__ = "subscribers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    context: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="general, post_valuation, hero")
    location: Mapped[str | None] = mapped_column(String(300), nullable=True, comment="Legacy: İl/İlçe/Mahalle tek string")
    location_city: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="İl")
    location_district: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="İlçe")
    location_neighborhood: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="Mahalle")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    welcome_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    subscribed_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_subscribers_email", "email", unique=True),
        Index("idx_subscribers_location", "location_city", "location_district", "location_neighborhood"),
    )


class Search(Base):
    """Arama geçmişi — kullanıcı aramaları ve sonuçları."""

    __tablename__ = "searches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Anonim aramalar için nullable")
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    neighborhood: Mapped[str | None] = mapped_column(String(200), nullable=True)
    result_avg_price: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    result_avg_rent: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    searched_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
