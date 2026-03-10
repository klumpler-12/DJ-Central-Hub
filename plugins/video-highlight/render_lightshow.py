import bpy
import os
import sys

# To run headless:
# blender -b -P render_lightshow.py -- /path/to/audio/clip.mp3 /path/to/output.mp4

def setup_scene(audio_path, output_path):
    print(f"Setting up Blender Lightshow with audio: {audio_path}")
    
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

    # 2. Add Audio to VSE (Video Sequence Editor)
    if not scene.sequence_editor:
        scene.sequence_editor_create()
    
    sound_strip = scene.sequence_editor.sequences.new_sound(
        name="Audio Highlight", 
        filepath=audio_path, 
        channel=1, 
        frame_start=1
    )
    
    # Set end frame based on audio length
    scene.frame_end = sound_strip.frame_duration

    # 3. Create a dynamic light
    bpy.ops.object.light_add(type='SPOT', location=(0, 0, 5))
    light = bpy.context.active_object
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

    # 6. Render Settings
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
            setup_scene(args[0], args[1])
        else:
            print("Usage: blender -b -P render_lightshow.py -- <audio_in.mp3> <video_out.mp4>")
