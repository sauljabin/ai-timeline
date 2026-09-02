def build_membership_svg(cold_temperature, warm_temperature, hot_temperature):
    # Keep layout values together so the plotting area is derived consistently.
    width = 720
    height = 420
    margin_left = 58
    margin_right = 28
    margin_top = 30
    margin_bottom = 58
    plot_width = width - margin_left - margin_right
    plot_height = height - margin_top - margin_bottom

    # Convert data coordinates into SVG pixel coordinates; SVG y values grow downward.
    def x_scale(value):
        return margin_left + (value / 44) * plot_width

    def y_scale(membership):
        return margin_top + (1 - membership) * plot_height

    def points_for(function):
        return " ".join(
            f"{x_scale(value):.1f},{y_scale(function(value)):.1f}"
            for value in range(45)
        )

    # A shared series table drives both the curves and their legend entries.
    series = [
        ("Cold", "#2f6f9f", cold_temperature),
        ("Warm", "#c56b2c", warm_temperature),
        ("Hot", "#b23a48", hot_temperature),
    ]

    # Horizontal guides make membership values easier to estimate visually.
    grid_lines = []
    for tick in [0, 0.25, 0.5, 0.75, 1.0]:
        y = y_scale(tick)
        grid_lines.append(
            f'<line x1="{margin_left}" y1="{y:.1f}" x2="{width - margin_right}" y2="{y:.1f}" stroke="#d7dde5" stroke-width="1" />'
        )
        grid_lines.append(
            f'<text x="{margin_left - 12}" y="{y + 4:.1f}" text-anchor="end" font-size="12" fill="#4b5563">{tick:.2g}</text>'
        )

    # Temperature ticks label the input domain used by the notebook example.
    x_ticks = []
    for tick in [0, 10, 20, 30, 40]:
        x = x_scale(tick)
        x_ticks.append(
            f'<line x1="{x:.1f}" y1="{height - margin_bottom}" x2="{x:.1f}" y2="{height - margin_bottom + 6}" stroke="#596579" stroke-width="1" />'
        )
        x_ticks.append(
            f'<text x="{x:.1f}" y="{height - margin_bottom + 24}" text-anchor="middle" font-size="12" fill="#4b5563">{tick}</text>'
        )

    # Sample each membership function and assemble matching legend swatches.
    polylines = []
    legend = []
    for index, (label, color, function) in enumerate(series):
        polylines.append(
            f'<polyline points="{points_for(function)}" fill="none" stroke="{color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />'
        )
        legend_x = margin_left + index * 116
        legend_y = height - 18
        legend.append(
            f'<line x1="{legend_x}" y1="{legend_y}" x2="{legend_x + 24}" y2="{legend_y}" stroke="{color}" stroke-width="4" stroke-linecap="round" />'
        )
        legend.append(
            f'<text x="{legend_x + 32}" y="{legend_y + 4}" font-size="13" fill="#111827">{label}</text>'
        )

    # Returning SVG text avoids a heavyweight plotting dependency and stays deterministic.
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Fuzzy temperature membership functions">
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="{width / 2}" y="22" text-anchor="middle" font-size="18" font-weight="700" fill="#111827">Temperature Membership Functions</text>
  {''.join(grid_lines)}
  <line x1="{margin_left}" y1="{height - margin_bottom}" x2="{width - margin_right}" y2="{height - margin_bottom}" stroke="#111827" stroke-width="1.5" />
  <line x1="{margin_left}" y1="{margin_top}" x2="{margin_left}" y2="{height - margin_bottom}" stroke="#111827" stroke-width="1.5" />
  {''.join(x_ticks)}
  {''.join(polylines)}
  <text x="{width / 2}" y="{height - 30}" text-anchor="middle" font-size="13" fill="#374151">Temperature (C)</text>
  <text x="17" y="{height / 2}" text-anchor="middle" font-size="13" fill="#374151" transform="rotate(-90 17 {height / 2})">Membership</text>
  {''.join(legend)}
</svg>'''
