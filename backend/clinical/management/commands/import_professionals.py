import sqlite3
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from clinical.models import Professional


def parse_datetime(value):
    if not value:
        return None
    dt = datetime.fromisoformat(value)
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_default_timezone())
    return dt


class Command(BaseCommand):
    help = "Importa registros da tabela clinical_professional de um arquivo SQLite legado para o banco atual."

    def add_arguments(self, parser):
        parser.add_argument(
            "--db-path",
            type=str,
            default="backend/db.sqlite3",
            help="Caminho para o arquivo SQLite legado (relativo à raiz do projeto, por padrão backend/db.sqlite3).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mostra o que seria importado sem gravar no banco atual.",
        )

    def handle(self, *args, **options):
        db_path = Path(options["db_path"])
        if not db_path.is_absolute():
            project_root = Path(settings.BASE_DIR).parent
            db_path = project_root / db_path

        if not db_path.exists():
            raise CommandError(f"Arquivo SQLite não encontrado: {db_path}")

        self.stdout.write(f"Lendo profissionais a partir de {db_path}")

        connection = sqlite3.connect(db_path)
        connection.row_factory = sqlite3.Row
        cursor = connection.cursor()

        columns = [
            "email",
            "username",
            "password",
            "full_name",
            "crp",
            "profession",
            "institution",
            "accepts_notifications",
            "is_active",
            "is_staff",
            "is_superuser",
            "first_name",
            "last_name",
            "last_login",
            "date_joined",
        ]

        cursor.execute(f"SELECT {', '.join(columns)} FROM clinical_professional")
        rows = cursor.fetchall()

        if not rows:
            self.stdout.write(self.style.WARNING("Nenhum registro encontrado no banco legado."))
            return

        dry_run = options["dry_run"]
        imported = 0
        updated = 0

        with transaction.atomic():
            for row in rows:
                row_data = {column: row[column] for column in columns}
                email = row_data["email"]
                if not email:
                    self.stdout.write(self.style.WARNING("Registro ignorado por email vazio."))
                    continue

                defaults = {
                    "username": row_data["username"] or email,
                    "password": row_data["password"],
                    "full_name": row_data["full_name"] or "",
                    "crp": row_data["crp"] or "",
                    "profession": row_data["profession"] or "",
                    "institution": row_data["institution"] or "",
                    "accepts_notifications": bool(row_data["accepts_notifications"]),
                    "is_active": bool(row_data["is_active"]),
                    "is_staff": bool(row_data["is_staff"]),
                    "is_superuser": bool(row_data["is_superuser"]),
                    "first_name": row_data["first_name"] or "",
                    "last_name": row_data["last_name"] or "",
                    "last_login": parse_datetime(row_data["last_login"]),
                    "date_joined": parse_datetime(row_data["date_joined"]) or timezone.now(),
                }

                action = "Atualizaria" if dry_run else "Atualizado"

                if dry_run:
                    exists = Professional.objects.filter(email=email).exists()
                    verb = "atualizaria" if exists else "cria"
                    self.stdout.write(f"[DRY-RUN] {verb} registro para {email}")
                    continue

                professional, created = Professional.objects.update_or_create(email=email, defaults=defaults)

                self.stdout.write(
                    f"{action} registro de {email} "
                    f"({'criado' if created else 'atualizado'})"
                )

                imported += int(created)
                updated += int(not created)

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"Importação concluída. Criados: {imported}, Atualizados: {updated}"))
        else:
            self.stdout.write(self.style.WARNING("Dry-run finalizado. Nenhuma alteração foi aplicada."))

        cursor.close()
        connection.close()
