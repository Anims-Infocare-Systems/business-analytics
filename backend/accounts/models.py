from django.db import models

class Tenant(models.Model):
    objects = models.Manager()
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
    #Sabarish


class UserRight(models.Model):
    """Form-wise access rights per ERP user (cloud DB table: usersrights)."""
    objects = models.Manager()
    id = models.AutoField(primary_key=True)
    company_code = models.CharField(max_length=50, db_index=True)
    user_id = models.IntegerField(db_index=True)
    form_key = models.CharField(max_length=64)
    has_access = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "usersrights"
        managed = False
        unique_together = (("company_code", "user_id", "form_key"),)
        indexes = [
            models.Index(fields=["company_code", "user_id"]),
        ]

    def __str__(self):
        return f"{self.company_code}:{self.user_id}:{self.form_key}"


class TenantApproval(models.Model):
    objects = models.Manager()
    id = models.AutoField(primary_key=True)
    tenantid = models.IntegerField(db_column="tenantid")
    companycode = models.CharField(max_length=50, db_column="Companycode")
    formname = models.CharField(max_length=50, db_column="formname") # Eapproval or Tapproval
    transactionno = models.CharField(max_length=100, db_column="Transactionno")
    transactiondate = models.DateField(null=True, blank=True, db_column="Transactiondate")
    transactiontype = models.CharField(max_length=100, null=True, blank=True, db_column="Transactiontype")
    approvedby = models.CharField(max_length=100, db_column="approvedby")
    datetime = models.DateTimeField(db_column="datetime")

    class Meta:
        db_table = "tenants_approvals"

    def __str__(self):
        return f"{self.companycode}:{self.formname}:{self.transactionno}"