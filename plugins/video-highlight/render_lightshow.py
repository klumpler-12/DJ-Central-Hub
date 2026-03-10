import bpy
import os
import sys

# To run headless:
# blender -b -P render_lightshow.py -- /path/to/audio/clip.mp3 /path/to/output.mp4 [--preview]

def setup_scene(audio_path, output_path, is_preview=False):
    print(f"Setting up Blender Lightshow with audio: {audio_path} (Preview: {is_preview})")
    
    # 1. Clear default cube
    bpy.ops.object.select_all(action='DESELECT')
    if "Cube" in bpy.data.objects:
        bpy.data.objects["Cube"].select_set(True)
        bpy.ops.object.delete()

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'  # or EEVEE
    scene.frame_start = 1
    # Frame rate = 30fps
    scene.render.fps = 30

    if is_preview:
        scene.cycles.samples = 16
        scene.render.resolution_percentage = 25
    else:
        scene.cycles.samples = 128
        scene.render.resolution_percentage = 100

    # 2. Add Audio to VSE (Video Sequence Editor)
    if not scene.sequence_editor:
        scene.sequence_editor_create()
    
    sound_strip = scene.sequence_editor.sequences.new_sound(
        name="Audio Highlight", 
        filepath=audio_path, 
        channel=1, 
        frame_start=1
    )
    
    # Set end frame based on audio length. For preview, limit to 5 seconds (150 frames)
    total_frames = sound_strip.frame_duration
    scene.frame_end = min(150, total_frames) if is_preview else total_frames

    # 3. Create a dynamic light
    bpy.ops.object.light_add(type='SPOT', location=(0, 0, 5))
    light = bpy.context.active_object
    light.name = "BassLight"
    light.data.energy = 0 # base energy
    light.data.spot_size = 1.5
    light.data.color = (1.0, 0.2, 0.5) # pinkish trippy
    
    # 4. Bake Sound to F-Curves for the light's energy
    light.data.keyframe_insert(data_path="energy", frame=1)
    
    # Change area to GRAPH_EDITOR to use the bake operator
    original_area = bpy.context.area.type
    bpy.context.area.type = 'GRAPH_EDITOR'
    
    # Select the energy curve
    light.animation_data.action.fcurves[0].select = True
    
    try:
        # 'bake_sound' applies the sound amplitudes to the selected keyframes
        bpy.ops.graph.sound_bake(filepath=audio_path, low=10, high=10000)
    except Exception as e:
        print(f"FAILED TO BAKE SOUND: {e}")
        
    bpy.context.area.type = original_area

    # Multiply the baked curve so it's visible (from 0-1 to 0-5000W)
    for index, fcurve in enumerate(light.animation_data.action.fcurves):
        for keyframe in fcurve.keyframe_points:
            keyframe.co.y *= 5000.0  # Boost intensity

    # 5. Add a simple plane floor to receive the light
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))

    # 6. Compositing: Chromatic Aberration (Trippy Bass Effect)
    scene.use_nodes = True
    tree = scene.node_tree
    
    # Clear default nodes
    for node in tree.nodes:
        tree.nodes.remove(node)

    # Add Nodes
    render_layers = tree.nodes.new(type='CompositorNodeRLayers')
    render_layers.location = (0, 0)

    lens_distortion = tree.nodes.new(type='CompositorNodeLensdist')
    lens_distortion.location = (300, 0)
    # Fit ensures the edges don't show blank areas when distorted
    lens_distortion.use_fit = True 
    lens_distortion.inputs["Distort"].default_value = 0.0 # Keep actual distortion at 0 so border isn't skewed

    composite = tree.nodes.new(type='CompositorNodeComposite')
    composite.location = (600, 0)

    # Link nodes
    tree.links.new(render_layers.outputs['Image'], lens_distortion.inputs['Image'])
    tree.links.new(lens_distortion.outputs['Image'], composite.inputs['Image'])

    # Drive Dispersion with the light's energy
    # We create a driver on the Dispersion input to be = BassLight Energy / 100000
    # Peak energy is 5000, so 5000/100000 = 0.05 max dispersion (subtle but noticeable chromatic aberration)
    dispersion_input = lens_distortion.inputs["Dispersion"]
    driver_fcurve = dispersion_input.driver_add("default_value")
    
    driver = driver_fcurve.driver
    driver.type = 'SCRIPTED'
    
    var = driver.variables.new()
    var.name = "energy_val"
    var.type = 'SINGLE_PROP'
    
    target = var.targets[0]
    target.id_type = 'LIGHT'
    target.id = light.data
    target.data_path = 'energy'
    
    driver.expression = "energy_val / 100000.0"

    # 7. Render Settings
    scene.render.filepath = output_path
    scene.render.image_settings.file_format = 'FFMPEG'
    scene.render.ffmpeg.format = 'MPEG4'
    scene.render.ffmpeg.codec = 'H264'
    scene.render.ffmpeg.audio_codec = 'AAC'
    
    print(f"Setup complete. Frames: {scene.frame_start} to {scene.frame_end}")
    
    print("Rendering animation...")
    bpy.ops.render.render(animation=True)
    print(f"Done rendering to {output_path}")

if __name__ == "__main__":
    # Get arguments passed after '--'
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1:]
        if len(args) >= 2:
            audio_in = args[0]
            video_out = args[1]
            is_preview = "--preview" in args
            setup_scene(audio_in, video_out, is_preview)
        else:
            print("Usage: blender -b -P render_lightshow.py -- <audio_in.mp3> <video_out.mp4> [--preview]")
