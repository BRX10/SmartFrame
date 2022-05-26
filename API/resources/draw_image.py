import wand.image
import PIL
import io


def calculate_crop_area(size_in, size):
    wi, hi = size_in
    w, h = size
    ratio_in = wi/hi
    ratio_out = w/h
    x = 0
    y = 0
    wo = None
    ho = None
    if ratio_in > ratio_out:
        wo = hi*ratio_out
        ho = hi
        x = (wi-wo)/2
    else:
        wo = wi
        ho = wi/ratio_out
        y = (hi-ho)/2
    return (x, y, x+wo, y+ho)


def convert_image_raspberry(image, size_frame):
    # Crop And Resize
    im = resize_and_crop(image, size_frame)
    ## grayscale. this mainly prevents image artifacts
    im = im.convert('I')
    ## remove alpha channel to enable conversion to palette
    im = im.convert('RGB')

    return im


def convert_image_arduino(image, size_frame):
    image = wand.image.Image(blob=image)
    image_affinity = wand.image.Image(filename ="img/eink-2color.png")
    image.remap(image_affinity, "floyd_steinberg")

    # Crop And Resize
    im = resize_and_crop(image.make_blob(), size_frame)
    return im


def resize_and_crop(image, size_frame):
    im = PIL.Image.open(io.BytesIO(image))
    crop = calculate_crop_area(im.size, (size_frame))
    im = im.resize(size_frame, resample=PIL.Image.LANCZOS, box=crop)
    return im 