import io
import logging
from typing import Any
from uuid import uuid4

from django.conf import settings
from django.core.files.base import ContentFile
from django.http.response import Http404
from django.shortcuts import redirect
from django.urls import reverse
from django.views.generic import DetailView, TemplateView
from django.views.generic.edit import CreateView
from PIL import Image, ImageSequence

from core.forms import OldManYellsAtForm, SetFireForm
from core.models import TempFile

logger = logging.getLogger(__name__)


class IndexView(TemplateView):
    template_name = "core/index.html"


class SetFireView(CreateView):
    model = TempFile
    form_class = SetFireForm

    def get_context_data(self, **kwargs) -> dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["action"] = "Set Fire"
        context["template_file"] = "templates/fire.gif"
        return context

    def form_valid(self, form: SetFireForm):
        transparent = form.cleaned_data["image_has_transparent_parts"]
        with Image.open(
            settings.EMOJI_TEMPLATES_DIR / "fire.gif"
        ) as im, io.BytesIO() as f:
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


class OldManYellsAtView(CreateView):
    model = TempFile
    form_class = OldManYellsAtForm

    def get_context_data(self, **kwargs) -> dict[str, Any]:
        context = super().get_context_data(**kwargs)
        context["action"] = "Yell At"
        context["template_file"] = "templates/old-man-yells-at.png"
        return context

    def form_valid(self, form: OldManYellsAtForm):
        input_image = Image.open(form.cleaned_data["input_file"])
        input_image = input_image.copy().resize(
            (48, 48), resample=Image.Resampling.LANCZOS, reducing_gap=10.0
        )
        with Image.open(
            settings.EMOJI_TEMPLATES_DIR / "old-man-yells-at.png"
        ) as im, io.BytesIO() as f:
            output_image = im.copy()
            output_image.paste(input_image, (2, 2))
            output_image.save(f, format="PNG")
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
