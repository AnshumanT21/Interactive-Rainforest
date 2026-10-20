# Uma's Rainforest: image prompt sheet (Gemini Nano Banana Pro)

## How to use this sheet

1. **Always choose the highest resolution** (4K if offered, otherwise 2K).
2. **Pick the aspect ratio shown** on each prompt (16:9, 3:4 or 1:1).
3. **Paste the STYLE line below in front of every prompt** (it's already built into each prompt, so copying a whole block is enough).
4. **Reference image:** once `00-style-anchor.png` looks right, **attach it to every later prompt** and add: *"Match the lighting, colour grading and photographic style of the attached reference image."* This keeps the whole forest looking like one place.
5. **Edit-mode prompts (marked ✏️):** upload the base image named in the prompt and use edit mode, so it stays the same bird.
6. **Save each image under the exact file name shown** into `UmaWebsite/assets-raw/`. Use PNG if Gemini offers it; JPG is fine too.
7. **Bird images use a plain grey background.** That's on purpose: I cut the birds out with a script. Don't worry about the background, only the bird matters.
8. If an image has the Gemini ✦ watermark in a corner, that's OK. Just tell me and I'll remove it.
9. If a bird looks wrong (wrong colours, extra toes, odd beak), regenerate it. **Accuracy matters more than speed.** The species notes in each prompt help Gemini get the colours right.

---

## ⚠️ FIX-UP ROUND (after first review, 2026-10-20)

**1. Remove the birds from the background plates.** Gemini put birds into almost every Batch 1 plate, even though the prompts said "no birds". I add the moving birds on top, so the plates have to be empty.

Use **edit mode**: upload each plate and paste this prompt:
> Remove every bird and animal from this image. Fill the areas where they were with matching natural background (leaves, branches, mist, sky) so it looks untouched. Keep everything else exactly the same: composition, lighting, colours, framing and resolution.

Save each result under its **original name plus `-clean`** (e.g. `p04-sunconure-clearing-clean`). Plates to fix:
`01-sky-above-clouds` (eagle), `02-canopy-reveal` (macaws), `p01` (macaws), `p02` (toucans), `p03` (eagle and a small bird), `p04` (sun conures), `p05` (parakeets), `p06` (conures), `p07` (quakers in and around the nest), `p08` (budgies), `p09` (lovebirds), `p10` (cockatiels), `p11` (owls in the hollow), `p12` (macaws flying).
If a few birds are still left after one edit, run the same prompt again on the result.
`00-style-anchor` doesn't need fixing because it isn't used on the site. **Stop attaching it as a reference now**, because its tiger may creep into new images.

**2. Fix two macaw flight frames.** They need to match `f-macaw-1-up` (same side-on camera angle, same body position):
- `f-macaw-3-down` shows the bird from a different angle (from behind, turning). Redo it in edit mode from `f-macaw-1-up` with the original "wings swept fully down" prompt, and add: *"The body, head and tail must stay in exactly the same position and angle; only the wings move."*
- `f-macaw-4-glide` came out almost the same as `f-macaw-1-up`. Redo it with: *"…wings spread wide and **flat, held level with the body**, tips slightly curved up, in a relaxed glide."*

**3. Still to do from Batch 3:** `f-budgie-2-mid`, `f-budgie-3-down`, `f-budgie-4-glide` (from `f-budgie-1-up`), all 7 blinks and the 6 special poses. Then Batch 4.

**Keep as they are:** all 11 bird images in Batch 2, `f-macaw-1-up`, `f-macaw-2-mid`, the three budgie colour frames, and the budgie flock. They look great.

You can keep saving into the `prompts/Batch N` folders; I copy them into `assets-raw` with tidy names.

---

Work through the batches in order. **Batch 1 + 2 is enough for me to build the real forest.** Batches 3 and 4 add the life and motion.

---

### STYLE (shared)
> Hyper-realistic wildlife photograph, shot on a full-frame camera with a 200mm telephoto lens at f/2.8, cinematic natural light, rich deep greens, soft atmospheric haze, fine feather detail, true-to-life colours, National Geographic quality, no text, no people, no frames.

### LIGHT for each stop (already included in the prompts)
- **Dawn mist:** stops 1–3 (cool, misty, pale gold sun through haze)
- **Bright midday:** stops 4–8 (green light, dappled sun patches)
- **Golden hour:** stops 9–10 (warm orange, long light rays)
- **Dusk:** stops 11–12 (deep blue-green shadows, last warm glow)

---

## BATCH 1: The world (16:9), 15 images

**00-style-anchor.png** (16:9)
> Hyper-realistic wildlife photograph, cinematic natural light, rich deep greens, soft atmospheric haze, true-to-life colours, National Geographic quality, no text, no people. Inside a dense tropical rainforest at dawn: huge moss-covered tree trunks, hanging lianas, giant monstera and fern leaves, thick mist between the trees, golden god-rays slanting through the canopy from the upper left. Deep perspective, layered depth, dark foreground edges, bright misty centre.

**01-sky-above-clouds.png** (16:9)
> Hyper-realistic photograph from above the clouds at sunrise, soft sea of white and pale-gold cumulus clouds stretching to the horizon, gentle warm sun low on the left, pale blue sky fading to peach, serene and cinematic, no text, no aircraft.

**02-canopy-reveal.png** (16:9)
> Hyper-realistic aerial photograph looking down and forward over an endless tropical rainforest canopy at dawn, dense layered treetops in many greens, low mist drifting in the valleys, a river glinting in the distance, a soft open area of sky in the top third (space for a large title), cinematic, National Geographic quality, no text.

**Stop plates** (the background behind each bird; **leave the centre-left and centre-right areas soft and uncluttered**, because the bird and text go there):

**p01-macaw-canopy.png** (16:9)
> Hyper-realistic photograph, top of a tropical rainforest canopy at dawn, the camera level with the highest treetops, misty valley behind, soft pale-gold sun glow upper left, rich deep greens, shallow depth of field, open sky in the upper half, cinematic, no birds, no text.

**p02-toucan-high-branch.png** (16:9)
> Hyper-realistic photograph inside the upper rainforest canopy at dawn, a thick horizontal mossy branch crossing the middle of the frame, background of misty blurred green foliage with soft light rays from the upper left, shallow depth of field, cinematic, no birds, no text.

**p03-amazon-mossy-limb.png** (16:9)
> Hyper-realistic photograph in a misty rainforest at dawn, a massive moss- and bromeliad-covered tree limb in the lower third, hanging lianas, background of soft blurred trunks fading into haze, pale cool light, shallow depth of field, cinematic, no birds, no text.

**p04-sunconure-clearing.png** (16:9)
> Hyper-realistic photograph of a bright rainforest clearing at midday, sunlight pouring through a gap in the canopy, warm dappled light on broad leaves, glowing yellow-green bokeh background, shallow depth of field, cinematic, no birds, no text.

**p05-ringneck-vines.png** (16:9)
> Hyper-realistic photograph in a rainforest at midday, thin hanging vines in the foreground, a deep dark-green blurred background with a few sun patches, strong colour contrast, shallow depth of field, cinematic, no birds, no text.

**p06-greencheek-leaves.png** (16:9)
> Hyper-realistic photograph in the rainforest understory at midday, huge glossy tropical leaves (banana, monstera, heliconia with red flowers) filling the edges of the frame, soft dappled sunlight, blurred green depth in the centre, cinematic, no birds, no text.

**p07-quaker-nest-tree.png** (16:9)
> Hyper-realistic photograph of a large rainforest tree at midday with a big bulky stick nest built in the fork of its branches on the right side, dappled light, blurred jungle background, shallow depth of field, cinematic, no birds, no text.

**p08-budgie-bush.png** (16:9)
> Hyper-realistic photograph of a sunny rainforest edge at midday, a dense flowering shrub with small leaves in the lower half, bright soft-focus green background, light pollen in the air, cinematic, no birds, no text.

**p09-lovebird-golden.png** (16:9)
> Hyper-realistic photograph in a rainforest at golden hour, warm orange light rays streaming through the trees from the left, glowing haze, a slender branch across the middle, dreamy warm bokeh background, shallow depth of field, cinematic, no birds, no text.

**p10-cockatiel-golden.png** (16:9)
> Hyper-realistic photograph of a rainforest at late golden hour, deep warm amber light, long shadows, silhouetted leaves at the edges, soft glowing background, shallow depth of field, cinematic, no birds, no text.

**p11-owl-dusk-hollow.png** (16:9)
> Hyper-realistic photograph of a rainforest at dusk, a huge ancient tree trunk on the right with a dark oval hollow at mid-height, deep blue-green shadows, a faint last warm glow in the background, tiny fireflies glowing in the dark, moody and cinematic, no birds, no text.

**p12-waterfall.png** (16:9)
> Hyper-realistic photograph of a tall tropical waterfall in a rainforest at dusk, white water plunging down a mossy dark rock face into a calm turquoise pool, thick mist and spray rising, ferns and hanging plants framing the falls, last golden light touching the mist, soft rainbow in the spray, cinematic long exposure silky water, National Geographic quality, no people, no text.

---

## BATCH 2: The birds (3:4), 11 images

All bird prompts end with the same background line so I can cut them out cleanly. Light direction is always **from the upper left** so the birds match the plates.

**b01-macaw-perched.png** (3:4)
> Hyper-realistic wildlife photograph of a Scarlet Macaw perched on a short natural branch, three-quarter view facing left, bright scarlet red body, yellow and blue wing bands, long red-and-blue tail, pale white bare face patch with fine lines, curved pale upper beak and black lower beak, soft natural light from the upper left with soft dawn tone, ultra-sharp feather detail, the whole bird and branch in frame with space around it, on a plain smooth medium-grey studio background.

**b02-toucan.png** (3:4)
> Hyper-realistic wildlife photograph of a Toco Toucan perched on a short mossy branch, side view facing left, black body, white throat, huge orange beak with a black tip, blue skin around the eye, soft natural light from the upper left with soft dawn tone, ultra-sharp detail, the whole bird and branch in frame, on a plain smooth medium-grey studio background.

**b03-amazon.png** (3:4)
> Hyper-realistic wildlife photograph of a Yellow-crowned Amazon Parrot perched on a short mossy branch, three-quarter view facing right, bright green body, yellow forehead, red patch on the wing bend, green tail with yellow-green tips, soft natural light from the upper left, ultra-sharp feather detail, the whole bird and branch in frame, on a plain smooth medium-grey studio background.

**b04-sun-conures.png** (3:4)
> Hyper-realistic wildlife photograph of two Sun Conures sitting side by side on a short branch, vivid golden-yellow and orange bodies with orange faces, green and blue flight feathers, dark beaks, one looking left and one looking toward the camera, bright warm midday light from the upper left, ultra-sharp feather detail, both birds and the branch fully in frame, on a plain smooth medium-grey studio background.

**b05-ringneck.png** (3:4)
> Hyper-realistic wildlife photograph of a blue Indian Ringneck Parakeet perched on a thin vine, side view facing left, powder-blue body, black and pale ring around the neck, bright red hooked beak, very long slender tail, midday light from the upper left, ultra-sharp detail, the whole bird including the full tail in frame, on a plain smooth medium-grey studio background.

**b06-green-cheeks.png** (3:4)
> Hyper-realistic wildlife photograph of two Green-cheeked Conures on a short branch, one peeking around the other, green bodies, grey-brown heads with green cheeks, scaled grey chest, maroon tails, blue flight feathers, white eye rings, midday light from the upper left, ultra-sharp detail, both birds and the branch in frame, on a plain smooth medium-grey studio background.

**b07-quakers.png** (3:4)
> Hyper-realistic wildlife photograph of two Quaker (Monk) Parakeets on a short twiggy branch, bright green bodies, pale grey foreheads, throats and scalloped grey chests, blue flight feathers, orange-pink beaks, one tilting its head curiously, midday light from the upper left, ultra-sharp detail, both birds and the branch in frame, on a plain smooth medium-grey studio background.

**b08-budgies-perched.png** (3:4)
> Hyper-realistic wildlife photograph of three budgerigars on a short flowering twig: one sky-blue with black-and-white barred head and wings, one bright green and yellow, one pale yellow, small dark throat spots, bright midday light from the upper left, ultra-sharp detail, all three birds and the twig in frame, on a plain smooth medium-grey studio background.

**b09-lovebirds.png** (3:4)
> Hyper-realistic wildlife photograph of two Rosy-faced (Peach-faced) Lovebirds sitting close together on a short branch, leaning toward each other, green bodies, peach-pink faces and throats, blue rumps, pale horn beaks, warm golden-hour light from the upper left, ultra-sharp detail, both birds and the branch in frame, on a plain smooth medium-grey studio background.

**b10-cockatiel.png** (3:4)
> Hyper-realistic wildlife photograph of a Cockatiel perched on a short branch, three-quarter view facing right, grey body with white wing patches, bright yellow face and tall yellow crest, round orange cheek patches, long grey tail, warm golden-hour light from the upper left, ultra-sharp detail, the whole bird including crest and tail in frame, on a plain smooth medium-grey studio background.

**b11-barn-owl.png** (3:4)
> Hyper-realistic wildlife photograph of an American Barn Owl perched on a short dark mossy stump, facing the camera, white heart-shaped facial disc, dark eyes, golden-buff and grey speckled back and wings, white chest with tiny dark spots, long feathered legs, soft cool dusk light with a faint warm rim light from the upper left, ultra-sharp feather detail, the whole owl and stump in frame, on a plain smooth medium-grey studio background.

---

## BATCH 3: Motion frames (edit mode ✏️ and 1:1), 20 images

**Flight frames (1:1).** Make the first one with a normal prompt, then make the others in edit mode from it.

**f-macaw-1-up.png** (1:1)
> Hyper-realistic wildlife photograph of a Scarlet Macaw flying to the left, side view, wings raised fully up at the top of the wingbeat, bright scarlet body, yellow and blue wing bands, long red-and-blue tail streaming behind, natural light from the upper left, ultra-sharp feather detail, the whole bird including the wingtips in frame, on a plain smooth medium-grey studio background.

✏️ **f-macaw-2-mid.png**: upload `f-macaw-1-up.png`:
> Keep everything identical: same bird, same size, same position, same lighting, same background, same framing. Change only the wings: now held straight out horizontally, mid-wingbeat.

✏️ **f-macaw-3-down.png**: upload `f-macaw-1-up.png`:
> Keep everything identical: same bird, same size, same position, same lighting, same background, same framing. Change only the wings: now swept fully down below the body at the bottom of the wingbeat.

✏️ **f-macaw-4-glide.png**: upload `f-macaw-1-up.png`:
> Keep everything identical: same bird, same size, same position, same lighting, same background, same framing. Change only the wings: now spread wide and slightly curved in a relaxed glide.

**f-budgie-1-up.png** (1:1)
> Hyper-realistic wildlife photograph of a sky-blue budgerigar flying to the right, side view, wings raised fully up, black-and-white barred head and wings, natural midday light from the upper left, ultra-sharp detail, the whole bird including wingtips in frame, on a plain smooth medium-grey studio background.

✏️ **f-budgie-2-mid.png**, **f-budgie-3-down.png**, **f-budgie-4-glide.png**: same three edit prompts as the macaw, uploading `f-budgie-1-up.png`.

✏️ **f-budgie-green-1-up.png**: upload `f-budgie-1-up.png`:
> Keep everything identical: same pose, size, lighting, background and framing. Change only the colours: bright green body with yellow head and the same black barring.

✏️ **f-budgie-yellow-1-up.png**: upload `f-budgie-1-up.png`:
> Keep everything identical: same pose, size, lighting, background and framing. Change only the colours: pale lemon-yellow body with faint grey barring on the wings.

**f-budgie-flock.png** (16:9). Uma's favourite, so this one gets a big moment:
> Hyper-realistic wildlife photograph of a flock of about fifteen budgerigars (sky-blue, bright green and pale yellow) bursting into flight together, wings in many different positions, some close and slightly motion-blurred, others smaller in the distance, bright midday light from the upper left, ultra-sharp detail on the nearest birds, on a plain smooth medium-grey studio background.

**Blinks (edit mode, keep the 3:4 ratio).** For each bird image from Batch 2, upload it and use:
> Keep everything identical: same bird, same pose, same branch, same lighting, same background, same framing. Change only the eyes: now gently closed in a blink.

Save each as the original name plus `-blink`:
`b02-toucan-blink.png`, `b03-amazon-blink.png`, `b05-ringneck-blink.png`, `b10-cockatiel-blink.png`, `b11-barn-owl-blink.png`
(For the pairs and trio, blink just **one** bird: `b04-sun-conures-blink.png`, `b09-lovebirds-blink.png`.)

**Special poses (edit mode, keep 3:4).**

✏️ **b02-toucan-turn.png**: upload `b02-toucan.png`:
> Keep everything identical except the head: the toucan has turned its head to look toward the camera, beak pointing slightly right.

✏️ **b07-quakers-tilt.png**: upload `b07-quakers.png`:
> Keep everything identical except the bird on the left: it tilts its head strongly to one side, curious.

✏️ **b09-lovebirds-nuzzle.png**: upload `b09-lovebirds.png`:
> Keep everything identical except the two birds now touch beaks and nuzzle each other affectionately.

✏️ **b10-cockatiel-crest-up.png**: upload `b10-cockatiel.png`:
> Keep everything identical except the crest: now raised fully upright and fanned, alert and excited.

✏️ **b11-barn-owl-left.png**: upload `b11-barn-owl.png`:
> Keep everything identical except the head: the owl has rotated its head to look toward the left of the frame.

✏️ **b11-barn-owl-right.png**: upload `b11-barn-owl.png`:
> Keep everything identical except the head: the owl has rotated its head to look toward the right of the frame.

---

## BATCH 4: Depth layers and butterflies, 9 images

**Clouds**: on pure black so I can use them as see-through layers (16:9):

**c01-cloud.png**, **c02-cloud.png**, **c03-cloud.png** (16:9, run the prompt three times)
> Hyper-realistic photograph of a single large soft white cumulus cloud with wispy edges, lit warm gold from the left, isolated on a pure solid black background, nothing else in frame.

**Foreground leaves** (16:9). The camera flies past these so they're big, dark and blurry:

**l01-fg-leaves-left.png** (16:9)
> Hyper-realistic photograph of large dark-green tropical leaves (monstera, banana leaf, ferns) entering from the left side of the frame, slightly out of focus, backlit with glowing edges, the right two-thirds of the image a plain smooth medium-grey studio background.

**l02-fg-leaves-right.png** (16:9)
> Same as above but the leaves enter from the right side, the left two-thirds plain smooth medium-grey studio background.

**l03-fg-hanging-vines.png** (16:9)
> Hyper-realistic photograph of hanging jungle vines and small leaves dangling from the top edge of the frame, slightly out of focus, the rest a plain smooth medium-grey studio background.

**Butterflies** (1:1):

**u01-morpho-open.png** (1:1)
> Hyper-realistic macro photograph of a Blue Morpho butterfly seen from directly above, wings fully open and flat, iridescent electric-blue wings with black edges, sharp detail, on a plain smooth medium-grey studio background.

✏️ **u02-morpho-closed.png**: upload `u01-morpho-open.png`:
> Keep the same butterfly, size, lighting and background, but its wings are now raised and nearly closed above its body, seen from above at an angle.

**u03-orange-open.png** (1:1)
> Hyper-realistic macro photograph of an orange Julia butterfly seen from directly above, wings fully open and flat, bright orange wings with thin black markings, sharp detail, on a plain smooth medium-grey studio background.

---

**Total: about 55 images.** When a batch is done, tell me and I'll pick it up from `assets-raw/`.
