from django.db import models

class Tenant(models.Model):
    id = models.AutoField(primary_key=True)
    company_code = models.CharField(max_length=50)
    company_name = models.CharField(max_length=100)

    erp_server = models.CharField(max_length=100)
    erp_database = models.CharField(max_length=100)
    erp_user = models.CharField(max_length=100)
    erp_password = models.CharField(max_length=100)
    erp_port = models.IntegerField()

    status = models.BooleanField()
    created_at = models.DateTimeField(null=True)

    class Meta:
        db_table = "tenants"   # VERY IMPORTANT
        managed = False        # DO NOT let Django modify table

    def __str__(self):
        return self.company_code