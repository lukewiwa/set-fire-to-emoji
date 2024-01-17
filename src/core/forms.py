from core.models import TempFile


from django import forms


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


class OldManYellsAtForm(forms.ModelForm):
    input_file = forms.ImageField(
        label="Image to yell at:", help_text="Image will be resized and yelled at"
    )

    class Meta:
        model = TempFile
        exclude = ("output_file",)
