"""
Dựng toàn bộ tài nguyên 3D cho web 20/10 bằng Blender (bpy), chạy headless:

    pip install bpy==4.2.0  # cần Python 3.11
    python blender/build_scene.py            # xuất .glb + render ảnh preview
    python blender/build_scene.py --no-render  # chỉ xuất .glb (nhanh)

Hoặc chạy bằng Blender cài sẵn:
    blender -b -P blender/build_scene.py -- --no-render

Đầu ra:
    public/models/lixi.glb   – bao lì xì (Body / Flap / Card / Seal) để web mở nắp
    public/models/rose.glb   – bông hồng (dùng trong web và video Remotion)
    public/og-image.png      – ảnh preview khi share link (render Cycles)
"""

import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_MODELS = os.path.join(ROOT, "public", "models")
OUT_OG = os.path.join(ROOT, "public", "og-image.png")

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else sys.argv[1:]
DO_RENDER = "--no-render" not in argv


# ---------------------------------------------------------------- helpers ---
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0.0, roughness=0.5, emission=None, strength=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = strength
    return mat


def srgb(hex_color):
    """#rrggbb -> linear RGB tuple (Blender làm việc trong không gian linear)."""
    hex_color = hex_color.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(hex_color[i : i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def apply_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def shade_smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


def box(name, size, location, mat, bevel=0.0, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        apply_modifiers(obj)
        shade_smooth(obj)
    assign(obj, mat)
    return obj


def join(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    return obj


def set_origin(obj, point):
    cursor = bpy.context.scene.cursor
    old = cursor.location.copy()
    cursor.location = point
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    cursor.location = old


def export_glb(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
        for c in o.children_recursive:
            c.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_draco_mesh_compression_enable=False,
    )
    print(f"  ✓ {os.path.relpath(path, ROOT)}  ({os.path.getsize(path) / 1024:.0f} KB)")


# ------------------------------------------------------------ materials ---
def make_materials():
    return {
        "red": material("LixiRed", srgb("#c8102e"), roughness=0.35),
        "red_dark": material("LixiRedDark", srgb("#8f0a1f"), roughness=0.4),
        "gold": material("Gold", srgb("#f5c451"), metallic=1.0, roughness=0.22),
        "paper": material("Paper", srgb("#fff6e5"), roughness=0.8),
        "petal": material("Petal", srgb("#e8365d"), roughness=0.45, emission=srgb("#ff2d6f"), strength=0.08),
        "petal_in": material("PetalInner", srgb("#b3123f"), roughness=0.5),
        "stem": material("Stem", srgb("#2f7d32"), roughness=0.6),
        "leaf": material("Leaf", srgb("#3c9a3f"), roughness=0.55),
    }


# ---------------------------------------------------------- lì xì model ---
W, H, T = 1.4, 2.0, 0.09  # rộng, cao, dày (bao lì xì đứng kiểu Việt Nam)


def gold_flower(mats, center, radius=0.13, name="Flower"):
    """Hoa mai 5 cánh mạ vàng (trang trí trên bao)."""
    parts = []
    for i in range(5):
        a = i / 5 * math.tau + math.pi / 2
        loc = Vector(center) + Vector((math.cos(a) * radius, -0.012, math.sin(a) * radius))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=1, location=loc)
        p = bpy.context.active_object
        p.scale = (radius * 0.75, 0.018, radius * 0.75)
        bpy.ops.object.transform_apply(scale=True)
        parts.append(p)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=Vector(center) + Vector((0, -0.03, 0)))
    c = bpy.context.active_object
    c.scale = (radius * 0.45, 0.02, radius * 0.45)
    bpy.ops.object.transform_apply(scale=True)
    parts.append(c)
    obj = join(parts, name)
    shade_smooth(obj)
    assign(obj, mats["gold"])
    return obj


def text_mesh(text, size, location, mat, name, extrude=0.012):
    bpy.ops.object.text_add(location=location, rotation=(math.pi / 2, 0, 0))
    t = bpy.context.active_object
    t.data.body = text
    t.data.size = size
    t.data.extrude = extrude
    t.data.bevel_depth = 0.003
    t.data.align_x = "CENTER"
    t.data.align_y = "CENTER"
    bpy.ops.object.convert(target="MESH")
    t = bpy.context.active_object
    t.name = name
    assign(t, mat)
    return t


def build_lixi(mats):
    front = -T / 2
    body = box("Body", (W, T, H), (0, 0, 0), mats["red"], bevel=0.035)

    # viền vàng
    trim = []
    inset, bw = 0.09, 0.022
    for (sx, sz, x, z) in [
        (W - 2 * inset, bw, 0, H / 2 - inset),
        (W - 2 * inset, bw, 0, -H / 2 + inset),
        (bw, H - 2 * inset, W / 2 - inset, 0),
        (bw, H - 2 * inset, -W / 2 + inset, 0),
    ]:
        trim.append(box("trim", (sx, 0.012, sz), (x, front - 0.004, z), mats["gold"]))
    trim_obj = join(trim, "Trim")

    # hoa văn + chữ
    deco = [
        gold_flower(mats, (0, front, -0.22), 0.16, "FlowerBig"),
        gold_flower(mats, (-0.42, front, -0.78), 0.07, "FlowerS1"),
        gold_flower(mats, (0.42, front, -0.78), 0.07, "FlowerS2"),
        gold_flower(mats, (-0.42, front, 0.32), 0.06, "FlowerS3"),
        gold_flower(mats, (0.42, front, 0.32), 0.06, "FlowerS4"),
    ]
    label = text_mesh("20 · 10", 0.24, (0, front - 0.01, -0.62), mats["gold"], "Label")
    deco_obj = join(deco + [label], "Deco")

    body_all = join([body, trim_obj, deco_obj], "Body")

    # nắp (tam giác bo tròn) – pivot tại bản lề trên cùng để web xoay mở
    verts, faces = [], []
    hinge_z, tip_z = H / 2, H / 2 - 0.78
    steps = 24
    outline = []
    for i in range(steps + 1):
        s = i / steps
        x = -W / 2 + s * W
        # đường cong mềm từ 2 góc xuống mũi nắp
        z = tip_z + (hinge_z - tip_z) * (abs(2 * s - 1) ** 1.6)
        outline.append((x * 0.985, z))
    verts = [(x, 0, z) for x, z in outline]
    verts.append((0, 0, hinge_z))
    center_idx = len(verts) - 1
    for i in range(steps):
        faces.append((i, i + 1, center_idx))
    mesh = bpy.data.meshes.new("FlapMesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    flap = bpy.data.objects.new("Flap", mesh)
    bpy.context.collection.objects.link(flap)
    flap.location = (0, front - 0.012, 0)
    sol = flap.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = 0.02
    bev = flap.modifiers.new("bevel", "BEVEL")
    bev.width = 0.006
    apply_modifiers(flap)
    assign(flap, mats["red_dark"])
    set_origin(flap, (0, front - 0.012, hinge_z))

    # dấu niêm phong vàng ở mũi nắp
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.15, depth=0.03, location=(0, front - 0.04, tip_z + 0.06), rotation=(math.pi / 2, 0, 0))
    seal = bpy.context.active_object
    seal.name = "Seal"
    m = seal.modifiers.new("bevel", "BEVEL")
    m.width = 0.01
    m.segments = 3
    apply_modifiers(seal)
    shade_smooth(seal)
    assign(seal, mats["gold"])
    heart = text_mesh("♥", 0.16, (0, front - 0.06, tip_z + 0.05), mats["red"], "SealHeart", extrude=0.006)
    seal = join([seal, heart], "Seal")
    seal.parent = flap
    seal.matrix_parent_inverse = flap.matrix_world.inverted()

    # tấm thiệp bên trong (web sẽ trượt lên khi mở)
    card = box("Card", (W - 0.22, 0.012, H - 0.25), (0, 0, -0.05), mats["paper"], bevel=0.02)
    card_trim = []
    for (sx, sz, x, z) in [
        (W - 0.4, 0.018, 0, H / 2 - 0.27),
        (W - 0.4, 0.018, 0, -H / 2 + 0.17),
        (0.018, H - 0.45, (W - 0.4) / 2, -0.05),
        (0.018, H - 0.45, -(W - 0.4) / 2, -0.05),
    ]:
        card_trim.append(box("ct", (sx, 0.016, sz), (x, -0.004, z), mats["gold"]))
    card = join([card] + card_trim, "Card")

    return body_all, flap, card


# ------------------------------------------------------------ rose model ---
def build_rose(mats, location=(0, 0, 0), name="Rose"):
    parts_outer, parts_inner = [], []
    golden = math.radians(137.5)
    n = 22
    for i in range(n):
        t = i / (n - 1)
        a = i * golden
        open_angle = math.radians(4 + 52 * t ** 1.6)  # cánh ngoài nở rộng hơn
        size = 0.12 + 0.2 * t
        dist = 0.02 + 0.13 * t
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1)
        p = bpy.context.active_object
        p.scale = (size * 0.8, size * 0.12, size)
        bpy.ops.object.transform_apply(scale=True)
        # uốn cánh hoa cong ra ngoài
        bend = p.modifiers.new("bend", "SIMPLE_DEFORM")
        bend.deform_method = "BEND"
        bend.deform_axis = "X"
        bend.angle = math.radians(-70 - 25 * t)
        apply_modifiers(p)
        p.location = (0, -dist, 0.32 + size * 0.55 - 0.1 * t)
        p.rotation_euler = (-open_angle, 0, 0)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        p.rotation_euler = (0, 0, a)
        bpy.ops.object.transform_apply(rotation=True)
        (parts_inner if i < 7 else parts_outer).append(p)

    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1, location=(0, 0, 0.42))
    bud = bpy.context.active_object
    bud.scale = (0.07, 0.07, 0.12)
    bpy.ops.object.transform_apply(scale=True)
    parts_inner.append(bud)

    outer = join(parts_outer, name + "Petals")
    inner = join(parts_inner, name + "Bud")
    for o, mat in ((outer, mats["petal"]), (inner, mats["petal_in"])):
        shade_smooth(o)
        assign(o, mat)

    # đài hoa
    sepals = []
    for i in range(5):
        a = i / 5 * math.tau
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.035, depth=0.22)
        s = bpy.context.active_object
        s.location = (math.cos(a) * 0.08, math.sin(a) * 0.08, 0.2)
        s.rotation_euler = (math.sin(a) * -1.9, math.cos(a) * 1.9, 0)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        sepals.append(s)

    # cành: đường cong bezier -> mesh
    curve = bpy.data.curves.new("stem", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.028
    curve.bevel_resolution = 4
    spline = curve.splines.new("BEZIER")
    pts = [(0, 0, 0.25), (0.05, 0.02, -0.6), (-0.04, 0, -1.6)]
    spline.bezier_points.add(len(pts) - 1)
    for bp, co in zip(spline.bezier_points, pts):
        bp.co = co
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    stem = bpy.data.objects.new("Stem", curve)
    bpy.context.collection.objects.link(stem)
    bpy.context.view_layer.objects.active = stem
    stem.select_set(True)
    bpy.ops.object.convert(target="MESH")

    leaves = []
    for (z, side, rot) in [(-0.55, 1, 0.5), (-0.95, -1, -0.6)]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=1)
        lf = bpy.context.active_object
        lf.scale = (0.2, 0.015, 0.09)
        bpy.ops.object.transform_apply(scale=True)
        b = lf.modifiers.new("bend", "SIMPLE_DEFORM")
        b.deform_method = "BEND"
        b.deform_axis = "Z"
        b.angle = math.radians(40)
        apply_modifiers(lf)
        lf.location = (side * 0.2, 0, z)
        lf.rotation_euler = (0, -side * 0.5, rot)
        bpy.ops.object.transform_apply(location=True, rotation=True)
        leaves.append(lf)

    green = join([stem] + sepals, name + "Stem")
    assign(green, mats["stem"])
    leaf = join(leaves, name + "Leaves")
    shade_smooth(leaf)
    assign(leaf, mats["leaf"])

    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for o in (outer, inner, green, leaf):
        o.parent = root
    root.location = location
    return root


# ----------------------------------------------------------- og render ---
def render_preview(mats):
    scene = bpy.context.scene
    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*srgb("#3a0b1e"), 1)
    bg.inputs["Strength"].default_value = 1.4

    # nền + bokeh
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 3, 0), rotation=(math.pi / 2, 0, 0))
    backdrop = bpy.context.active_object
    assign(backdrop, material("Backdrop", srgb("#5b0f2e"), roughness=0.9))
    import random

    random.seed(2010)
    for i in range(40):
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=random.uniform(0.03, 0.09),
            location=(random.uniform(-4, 4), random.uniform(1, 2.5), random.uniform(-2, 2.2)),
        )
        b = bpy.context.active_object
        col = random.choice([srgb("#ffd36e"), srgb("#ff8fb1"), srgb("#fff1c9")])
        assign(b, material(f"Glow{i % 3}", col, emission=col, strength=12))

    bpy.ops.object.light_add(type="AREA", location=(-2.5, -4, 3))
    key = bpy.context.active_object
    key.data.energy = 900
    key.data.size = 4
    key.data.color = (1, 0.92, 0.85)
    key.rotation_euler = (math.radians(55), 0, math.radians(-30))
    bpy.ops.object.light_add(type="AREA", location=(3, -2, -1))
    rim = bpy.context.active_object
    rim.data.energy = 500
    rim.data.color = (1, 0.55, 0.7)
    rim.rotation_euler = (math.radians(100), 0, math.radians(50))

    bpy.ops.object.camera_add(location=(0, -8.0, 0.35), rotation=(math.radians(88), 0, 0))
    cam = bpy.context.active_object
    cam.data.lens = 50
    cam.data.dof.use_dof = True
    cam.data.dof.focus_distance = 7.8
    cam.data.dof.aperture_fstop = 2.2
    scene.camera = cam

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 630
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
    scene.render.filepath = OUT_OG
    bpy.ops.render.render(write_still=True)
    print(f"  ✓ {os.path.relpath(OUT_OG, ROOT)}")


# ----------------------------------------------------------------- main ---
def main():
    os.makedirs(OUT_MODELS, exist_ok=True)
    print("🌹 Blender", bpy.app.version_string, "– dựng mô hình 20/10")

    reset_scene()
    mats = make_materials()
    body, flap, card = build_lixi(mats)
    export_glb(os.path.join(OUT_MODELS, "lixi.glb"), [body, flap, card])

    reset_scene()
    mats = make_materials()
    rose = build_rose(mats)
    export_glb(os.path.join(OUT_MODELS, "rose.glb"), [rose])

    if DO_RENDER:
        # ảnh preview khi share link: chỉ hoa hồng + chữ 20·10 (không để lộ món quà)
        reset_scene()
        mats = make_materials()
        title = text_mesh("20·10", 0.8, (-1.15, -0.4, 0.25), mats["gold"], "Title", extrude=0.09)
        title.rotation_euler = (math.radians(90), 0, math.radians(8))
        for loc, rot in [((1.3, -0.4, -0.2), (0.2, -0.5, 0.3)), ((2.2, 0.3, 0.1), (-0.1, 0.4, -0.4)), ((0.6, 0.6, -0.9), (0.4, 0.2, 0.9)), ((-2.6, 0.5, -1.3), (0.3, 0.3, -0.5))]:
            r = build_rose(mats, loc, name=f"Rose{loc[0]}")
            r.rotation_euler = rot
        render_preview(mats)

main()
# bpy hay segfault khi giải phóng lúc thoát interpreter – mọi file đã ghi xong nên thoát thẳng
sys.stdout.flush()
os._exit(0)
