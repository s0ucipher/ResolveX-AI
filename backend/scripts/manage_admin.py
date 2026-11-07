#!/usr/bin/env python3
"""
ComplainAI — Administrative User Management CLI Tool
Used by authorized server administrators / IT personnel to securely manage administrator privileges.

Usage:
    python -m backend.scripts.manage_admin list
    python -m backend.scripts.manage_admin promote <email>
    python -m backend.scripts.manage_admin demote <email>
    python -m backend.scripts.manage_admin create <email> <name> <password>
"""

import sys
import argparse
from backend.database import SessionLocal
from backend.models import User
from backend.auth import get_password_hash, ADMIN_EMAILS

def list_admins():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        admins = [u for u in users if u.role == "admin"]
        regular = [u for u in users if u.role != "admin"]
        print(f"\n================ ComplainAI User Privileges ================")
        print(f"Configured Environment ADMIN_EMAILS: {', '.join(ADMIN_EMAILS)}")
        print(f"\n--- Authorized Administrators ({len(admins)}) ---")
        for a in admins:
            print(f"  [ID {a.id}] {a.name} <{a.email}> (Active: {a.is_active})")
        print(f"\n--- Standard Users / Students ({len(regular)}) ---")
        for r in regular[:15]:
            print(f"  [ID {r.id}] {r.name} <{r.email}>")
        if len(regular) > 15:
            print(f"  ... and {len(regular) - 15} more users")
        print("============================================================\n")
    finally:
        db.close()

def promote_user(email: str):
    clean_email = email.strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            print(f"[-] Error: User with email '{clean_email}' not found in database.")
            sys.exit(1)
        if user.role == "admin":
            print(f"[!] Notice: User '{user.name}' <{clean_email}> is already an administrator.")
            return
        user.role = "admin"
        db.commit()
        db.refresh(user)
        print(f"[+] Success: User '{user.name}' <{clean_email}> has been granted Administrator privileges.")
    finally:
        db.close()

def demote_user(email: str):
    clean_email = email.strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == clean_email).first()
        if not user:
            print(f"[-] Error: User with email '{clean_email}' not found in database.")
            sys.exit(1)
        if user.role != "admin":
            print(f"[!] Notice: User '{user.name}' <{clean_email}> is already a standard user.")
            return
        user.role = "user"
        db.commit()
        db.refresh(user)
        print(f"[+] Success: User '{user.name}' <{clean_email}> has been demoted to standard user.")
    finally:
        db.close()

def create_admin(email: str, name: str, password: str):
    clean_email = email.strip().lower()
    clean_name = name.strip()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == clean_email).first()
        if existing:
            if existing.role != "admin":
                existing.role = "admin"
                existing.name = clean_name or existing.name
                if password:
                    existing.password_hash = get_password_hash(password)
                db.commit()
                print(f"[+] Success: Existing user <{clean_email}> updated to Administrator role.")
            else:
                if password:
                    existing.password_hash = get_password_hash(password)
                    db.commit()
                    print(f"[+] Success: Password updated for Administrator <{clean_email}>.")
                else:
                    print(f"[!] Notice: Administrator <{clean_email}> already exists.")
            return

        new_admin = User(
            name=clean_name,
            email=clean_email,
            password_hash=get_password_hash(password),
            role="admin",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"[+] Success: New Administrator created: '{clean_name}' <{clean_email}> (ID: {new_admin.id}).")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="ComplainAI Admin Privilege Management")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    subparsers.add_parser("list", help="List all administrator accounts")

    promote_parser = subparsers.add_parser("promote", help="Promote a user account to administrator")
    promote_parser.add_argument("email", help="User email to promote")

    demote_parser = subparsers.add_parser("demote", help="Demote an administrator account to user")
    demote_parser.add_argument("email", help="User email to demote")

    create_parser = subparsers.add_parser("create", help="Create a new administrator account")
    create_parser.add_argument("email", help="Administrator email")
    create_parser.add_argument("name", help="Administrator full name")
    create_parser.add_argument("password", help="Administrator password")

    args = parser.parse_args()

    if args.command == "list":
        list_admins()
    elif args.command == "promote":
        promote_user(args.email)
    elif args.command == "demote":
        demote_user(args.email)
    elif args.command == "create":
        create_admin(args.email, args.name, args.password)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()

