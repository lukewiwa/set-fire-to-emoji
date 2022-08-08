import uuid

from django.db import models
from django.urls import reverse


class TempFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    output_file = models.FileField()

    def get_absolute_url(self):
        return reverse('set-fire-result', kwargs={'pk': self.pk})