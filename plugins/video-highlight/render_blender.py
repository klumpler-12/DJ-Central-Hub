"""
DJ Tripadvisor - Blender Music-Reactive Lightshow Renderer

Creates a trippy music-reactive video with:
  - T+A logo as 3D emissive plane (pulses with volume)
  - Multiple colored spotlights driven by bass/mid/high frequencies
  - Chromatic aberration driven by bass intensity
  - Glitch/bloom compositor effects
  - Dark environment with volumetric fog

Usage (headless):
  blender -b -P render_blender.py -- <audio.wav> <output.mp4> <logo.png> [--preview]
"""

import bpy
import os
import sys
import math


def setup_scene(audio_path, output_path, logo_path, is_preview=False):
    print(f"Setting up Blender Lightshow")
    print(f"  Audio:   {audio_path}")
    print(f"  Output:  {output_path}")
    print(f"  Logo:    {logo_path}")
    print(f"  Preview: {is_preview}")

    # ─── Clean Scene ──────────────────────────────────────────────────────────
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Remove all existing materials, textures, images
    for block in [bpy.data.meshes, bpy.data.materials, bpy.data.textures, bpy.data.images]:
        for item in block:
            block.remove(item)

    scene = bpy.context.scene

    # ─── Render Settings ─────────────────────────────────────────────────────
    scene.render.engine = 'BLENDER_EEVEE_NEXT' if bpy.app.version >= (4, 0, 0) else 'BLENDER_EEVEE'
    scene.render.fps = 30
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1080

    if is_preview:
        scene.render.resolution_percentage = 25
        scene.render.fps = 15
    else:
        scene.render.resolution_percentage = 100

    # EEVEE settings for bloom and volumetrics
    eevee = scene.eevee
    if hasattr(eevee, 'use_bloom'):
        eevee.use_bloom = True
        eevee.bloom_threshold = 0.5
        eevee.bloom_intensity = 0.3
    if hasattr(eevee, 'use_volumetric_lights'):
        eevee.use_volumetric_lights = True

    # Dark world background
    world = bpy.data.worlds.new("DarkWorld")
    scene.world = world
    world.use_nodes = True
    bg_node = world.node_tree.nodes.get("Background")
    if bg_node:
        bg_node.inputs['Color'].default_value = (0.005, 0.002, 0.01, 1.0)
        bg_node.inputs['Strength'].default_value = 0.1

    # ─── Audio Setup ─────────────────────────────────────────────────────────
    if not scene.sequence_editor:
        scene.sequence_editor_create()

    sound_strip = scene.sequence_editor.sequences.new_sound(
        name="AudioClip",
        filepath=audio_path,
        channel=1,
        frame_start=1
    )
    total_frames = sound_strip.frame_duration
    scene.frame_start = 1
    scene.frame_end = min(150, total_frames) if is_preview else total_frames

    # ─── Camera ──────────────────────────────────────────────────────────────
    bpy.ops.object.camera_add(location=(0, -6, 0), rotation=(math.pi / 2, 0, 0))
    cam = bpy.context.active_object
    cam.name = "Camera"
    scene.camera = cam
    cam.data.lens = 35

    # ─── Logo Plane ──────────────────────────────────────────────────────────
    # Import logo as texture on an emissive plane
    bpy.ops.mesh.primitive_plane_add(size=3.5, location=(0, 0, 0))
    logo_plane = bpy.context.active_object
    logo_plane.name = "LogoPlane"

    # Create emissive material with logo texture
    mat = bpy.data.materials.new("LogoMaterial")
    mat.use_nodes = True
    mat.blend_method = 'BLEND' if hasattr(mat, 'blend_method') else 'OPAQUE'
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear defaults
    for n in nodes:
        nodes.remove(n)

    # Texture node
    tex_node = nodes.new('ShaderNodeTexImage')
    tex_node.location = (-400, 0)
    if os.path.exists(logo_path):
        tex_node.image = bpy.data.images.load(logo_path)
        tex_node.image.alpha_mode = 'STRAIGHT'

    # Emission node (logo glows)
    emission = nodes.new('ShaderNodeEmission')
    emission.location = (0, 100)
    emission.inputs['Strength'].default_value = 5.0

    # Transparent node (for alpha)
    transparent = nodes.new('ShaderNodeBsdfTransparent')
    transparent.location = (0, -100)

    # Mix shader (emission + transparent based on alpha)
    mix = nodes.new('ShaderNodeMixShader')
    mix.location = (200, 0)

    # Output
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    # Connect: tex color -> emission color, tex alpha -> mix factor
    links.new(tex_node.outputs['Color'], emission.inputs['Color'])
    links.new(tex_node.outputs['Alpha'], mix.inputs['Fac'])
    links.new(transparent.outputs['BSDF'], mix.inputs[1])
    links.new(emission.outputs['Emission'], mix.inputs[2])
    links.new(mix.outputs['Shader'], output.inputs['Surface'])

    logo_plane.data.materials.append(mat)

    # Keyframe the emission strength so we can bake sound to it
    emission.inputs['Strength'].default_value = 2.0
    emission.inputs['Strength'].keyframe_insert(data_path="default_value", frame=1)

    # ─── Lights ──────────────────────────────────────────────────────────────
    # Bass light: deep red/pink from below
    bpy.ops.object.light_add(type='SPOT', location=(0, -3, -4))
    bass_light = bpy.context.active_object
    bass_light.name = "BassLight"
    bass_light.data.energy = 0
    bass_light.data.spot_size = 2.0
    bass_light.data.color = (1.0, 0.15, 0.35)  # Hot pink
    bass_light.data.use_shadow = True
    # Point at logo
    constraint = bass_light.constraints.new('TRACK_TO')
    constraint.target = logo_plane
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'

    bass_light.data.keyframe_insert(data_path="energy", frame=1)

    # Mid light: purple/blue from left
    bpy.ops.object.light_add(type='SPOT', location=(-5, -2, 2))
    mid_light = bpy.context.active_object
    mid_light.name = "MidLight"
    mid_light.data.energy = 0
    mid_light.data.spot_size = 1.8
    mid_light.data.color = (0.53, 0.36, 0.96)  # Purple
    constraint = mid_light.constraints.new('TRACK_TO')
    constraint.target = logo_plane
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'

    mid_light.data.keyframe_insert(data_path="energy", frame=1)

    # High light: cyan/teal from right
    bpy.ops.object.light_add(type='SPOT', location=(5, -2, 2))
    high_light = bpy.context.active_object
    high_light.name = "HighLight"
    high_light.data.energy = 0
    high_light.data.spot_size = 1.5
    high_light.data.color = (0.1, 0.85, 0.75)  # Teal
    constraint = high_light.constraints.new('TRACK_TO')
    constraint.target = logo_plane
    constraint.track_axis = 'TRACK_NEGATIVE_Z'
    constraint.up_axis = 'UP_Y'

    high_light.data.keyframe_insert(data_path="energy", frame=1)

    # Ambient fill light (very dim)
    bpy.ops.object.light_add(type='POINT', location=(0, -5, 3))
    fill = bpy.context.active_object
    fill.name = "FillLight"
    fill.data.energy = 50
    fill.data.color = (0.1, 0.05, 0.15)

    # ─── Floor (reflective dark surface) ─────────────────────────────────────
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -2))
    floor = bpy.context.active_object
    floor.name = "Floor"

    floor_mat = bpy.data.materials.new("FloorMat")
    floor_mat.use_nodes = True
    floor_nodes = floor_mat.node_tree.nodes
    principled = floor_nodes.get("Principled BSDF")
    if principled:
        principled.inputs['Base Color'].default_value = (0.01, 0.005, 0.02, 1)
        principled.inputs['Roughness'].default_value = 0.1
        principled.inputs['Metallic'].default_value = 0.9
        if 'Specular IOR Level' in principled.inputs:
            principled.inputs['Specular IOR Level'].default_value = 0.8
        elif 'Specular' in principled.inputs:
            principled.inputs['Specular'].default_value = 0.8
    floor.data.materials.append(floor_mat)

    # ─── Sound Bake to F-Curves ──────────────────────────────────────────────
    def bake_sound_to_object(obj, data_path, low_freq, high_freq, scale_factor):
        """Bake audio frequency range to an object's animated property."""
        # Ensure we have animation data
        if not obj.animation_data:
            obj.animation_data_create()
        if not obj.animation_data.action:
            obj.animation_data.action = bpy.data.actions.new(name=f"{obj.name}_Action")

        # We need to be in the graph editor context for bake
        # Use the driver approach instead for reliability
        pass

    # Since sound_bake requires specific UI context, use drivers with a
    # simulated approach: keyframe the values based on frame number
    # We'll bake manually by reading the audio in Python

    print("  Baking audio to keyframes...")

    # Simple audio analysis using Blender's internal audio
    # We'll keyframe the light energies manually
    import struct
    import wave

    def analyze_wav(wav_path, total_frames, fps):
        """Read WAV and compute per-frame bass/mid/high energy."""
        with wave.open(wav_path, 'rb') as wf:
            channels = wf.getnchannels()
            sample_rate = wf.getframerate()
            n_frames = wf.getnframes()
            sw = wf.getsampwidth()
            raw = wf.readframes(n_frames)

        # Parse samples
        if sw == 2:
            samples = list(struct.unpack(f'<{n_frames * channels}h', raw))
            samples = [s / 32768.0 for s in samples]
        elif sw == 4:
            samples = list(struct.unpack(f'<{n_frames * channels}i', raw))
            samples = [s / 2147483648.0 for s in samples]
        else:
            return [0.5] * total_frames, [0.5] * total_frames, [0.5] * total_frames, [0.5] * total_frames

        # Mix to mono
        if channels == 2:
            mono = [(samples[i] + samples[i + 1]) / 2.0 for i in range(0, len(samples), 2)]
        else:
            mono = samples

        samples_per_frame = sample_rate // fps
        volumes = []
        bass_vals = []
        mid_vals = []
        high_vals = []

        for f in range(total_frames):
            start = f * samples_per_frame
            end = min(start + samples_per_frame, len(mono))
            window = mono[start:end]
            if not window:
                volumes.append(0)
                bass_vals.append(0)
                mid_vals.append(0)
                high_vals.append(0)
                continue

            # RMS volume
            rms = math.sqrt(sum(s * s for s in window) / len(window))
            volumes.append(rms)

            # Simplified frequency bands using zero-crossing rate and energy
            # Low-pass approximation: smooth samples = bass
            smoothed = [window[0]]
            for i in range(1, len(window)):
                smoothed.append(0.95 * smoothed[-1] + 0.05 * window[i])
            bass_energy = math.sqrt(sum(s * s for s in smoothed) / len(smoothed))

            # High-pass approximation: difference = high
            diff = [window[i] - window[i - 1] for i in range(1, len(window))]
            high_energy = math.sqrt(sum(d * d for d in diff) / max(1, len(diff))) if diff else 0

            # Mid = total - bass - high (clamped)
            mid_energy = max(0, rms - bass_energy * 0.5 - high_energy * 0.5)

            bass_vals.append(bass_energy)
            mid_vals.append(mid_energy)
            high_vals.append(high_energy)

        # Normalize
        def normalize_smooth(vals, alpha=0.35):
            peak = max(max(vals), 0.001)
            normed = [v / peak for v in vals]
            out = [normed[0]]
            for i in range(1, len(normed)):
                out.append(alpha * normed[i] + (1 - alpha) * out[-1])
            return out

        return (normalize_smooth(volumes, 0.4),
                normalize_smooth(bass_vals, 0.35),
                normalize_smooth(mid_vals, 0.3),
                normalize_smooth(high_vals, 0.25))

    fps = scene.render.fps
    n_frames = scene.frame_end - scene.frame_start + 1
    vol_data, bass_data, mid_data, high_data = analyze_wav(audio_path, n_frames, fps)

    # Keyframe bass light energy
    print(f"  Setting {n_frames} keyframes...")
    for f in range(n_frames):
        frame = scene.frame_start + f
        bass_val = bass_data[f] if f < len(bass_data) else 0.5
        mid_val = mid_data[f] if f < len(mid_data) else 0.5
        high_val = high_data[f] if f < len(high_data) else 0.5
        vol_val = vol_data[f] if f < len(vol_data) else 0.5

        # Bass light: 0 to 8000W driven by bass
        bass_light.data.energy = bass_val * 8000
        bass_light.data.keyframe_insert(data_path="energy", frame=frame)

        # Mid light: 0 to 5000W driven by mids
        mid_light.data.energy = mid_val * 5000
        mid_light.data.keyframe_insert(data_path="energy", frame=frame)

        # High light: 0 to 4000W driven by highs
        high_light.data.energy = high_val * 4000
        high_light.data.keyframe_insert(data_path="energy", frame=frame)

        # Logo emission: pulses 2-15 with volume
        emission.inputs['Strength'].default_value = 2.0 + vol_val * 13.0
        emission.inputs['Strength'].keyframe_insert(data_path="default_value", frame=frame)

    # ─── Compositor (Chromatic Aberration + Glare) ───────────────────────────
    scene.use_nodes = True
    tree = scene.node_tree

    for node in tree.nodes:
        tree.nodes.remove(node)

    # Render Layers
    rl = tree.nodes.new('CompositorNodeRLayers')
    rl.location = (0, 0)

    # Glare node (bloom/glow effect)
    glare = tree.nodes.new('CompositorNodeGlare')
    glare.location = (300, 100)
    glare.glare_type = 'FOG_GLOW'
    glare.quality = 'LOW' if is_preview else 'MEDIUM'
    glare.mix = 0.3
    glare.threshold = 0.5

    # Lens Distortion (chromatic aberration)
    lens = tree.nodes.new('CompositorNodeLensdist')
    lens.location = (600, 0)
    lens.use_fit = True
    lens.inputs["Distort"].default_value = 0.0

    # Drive dispersion with bass energy via driver
    dispersion_input = lens.inputs["Dispersion"]
    driver_fc = dispersion_input.driver_add("default_value")
    driver = driver_fc.driver
    driver.type = 'SCRIPTED'

    var = driver.variables.new()
    var.name = "bass_e"
    var.type = 'SINGLE_PROP'
    target = var.targets[0]
    target.id_type = 'LIGHT'
    target.id = bass_light.data
    target.data_path = 'energy'
    # Peak bass energy is 8000, we want max dispersion ~0.08
    driver.expression = "bass_e / 100000.0"

    # Color Balance (push towards purple/pink)
    color_bal = tree.nodes.new('CompositorNodeColorBalance')
    color_bal.location = (900, 0)
    color_bal.correction_method = 'OFFSET_POWER_SLOPE'
    color_bal.slope = (1.05, 0.95, 1.1)    # Slight purple push
    color_bal.power = (1.0, 0.95, 1.05)
    color_bal.offset = (0.02, 0.0, 0.03)   # Subtle purple in shadows

    # Composite output
    comp = tree.nodes.new('CompositorNodeComposite')
    comp.location = (1200, 0)

    # Connect
    tree.links.new(rl.outputs['Image'], glare.inputs['Image'])
    tree.links.new(glare.outputs['Image'], lens.inputs['Image'])
    tree.links.new(lens.outputs['Image'], color_bal.inputs['Image'])
    tree.links.new(color_bal.outputs['Image'], comp.inputs['Image'])

    # ─── Output Settings ─────────────────────────────────────────────────────
    scene.render.filepath = output_path
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.constant_rate_factor = 'MEDIUM' if not is_preview else 'LOW'
    scene.render.ffmpeg.audio_codec = 'AAC'
    scene.render.ffmpeg.audio_bitrate = 192

    print(f"  Setup complete. Rendering frames {scene.frame_start}-{scene.frame_end}...")
    bpy.ops.render.render(animation=True)
    print(f"  Render complete: {output_path}")


if __name__ == "__main__":
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1:]
        if len(args) >= 3:
            audio_in = args[0]
            video_out = args[1]
            logo_in = args[2]
            is_preview = "--preview" in args
            setup_scene(audio_in, video_out, logo_in, is_preview)
        else:
            print("Usage: blender -b -P render_blender.py -- <audio.wav> <output.mp4> <logo.png> [--preview]")
    else:
        print("Run with: blender -b -P render_blender.py -- <audio.wav> <output.mp4> <logo.png> [--preview]")
