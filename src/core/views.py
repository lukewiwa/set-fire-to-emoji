import io
import logging
from uuid import uuid4

from django import forms
from django.conf import settings
from django.core.files.base import ContentFile
from django.http.response import Http404
from django.shortcuts import redirect
from django.urls import reverse
from django.views.generic import DetailView
from django.views.generic.edit import CreateView
from PIL import Image, ImageSequence

from core.models import TempFile

logger = logging.getLogger(__name__)


class SetFireForm(forms.ModelForm):
    input_file = forms.ImageField(
        label="Image to set on fire:", help_text="Image will be resized and set on fire"
    )
    image_has_transparent_parts = forms.BooleanField(
        required=False,
        help_text="Images with transparency need some special processing.",
    )

    class Meta:
        model = TempFile
        exclude = ("output_file",)


class SetFireView(CreateView):
    model = TempFile
    form_class = SetFireForm

    def form_valid(self, form: SetFireForm):
        transparent = form.cleaned_data["image_has_transparent_parts"]
        with Image.open(settings.BASE_DIR / "fire.gif") as im, io.BytesIO() as f:
            images = []
            transparency = im.info["transparency"]
            duration = im.info["duration"]
            loop = im.info["loop"]
            input_image = Image.open(form.cleaned_data["input_file"])
            input_image = input_image.copy().resize((im.width, im.height))
            if transparent:
                input_image = input_image.convert("RGBA")
            else:
                input_image = input_image.convert("RGB")
            for frame in ImageSequence.Iterator(im):
                i = input_image.copy()
                frame = frame.copy().convert("RGBA")
                i.paste(frame, mask=frame)
                images.append(i)

            images[0].save(
                f,
                format="GIF",
                save_all=True,
                append_images=images[1:],
                optimize=False,
                transparency=transparency,
                duration=duration,
                loop=loop,
                disposal=2,
            )
            f.seek(0)
            form.instance.output_file.save(
                f"{str(uuid4())}.gif", ContentFile(f.read()), save=True
            )
            logger.info("Generated fire gif with id %s")
            return super().form_valid(form)


class ResultView(DetailView):
    model = TempFile

    def get(self, request, *args, **kwargs):
        try:
            return super().get(request, *args, **kwargs)
        except Http404:
            logger.warning("Couldn't find image with id %s", kwargs["pk"])
            return redirect(reverse("set-fire"))
