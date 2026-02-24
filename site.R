page_head(
  title = "National Capital Region",
  description = "A data site to explore data within the U.S. national capital region.",
  icon = "https://raw.githubusercontent.com/uva-bi-sdad/community/main/logo.svg"
)
page_navbar(
  title = "National Capital Region",
  logo = "https://raw.githubusercontent.com/uva-bi-sdad/community/main/logo.svg",
  input_button("Reset", "reset_selection", "reset.selection", class = "btn-link", note = "Reset the menu inputs to their defaults."),
  input_button("Filter", "filter", "open.filter", class = "btn-link"),
  list(
    name = "Settings",
    backdrop = "false",
    class = "menu-compact",
    items = list(
      input_switch("Dark Theme", id = "settings.theme_dark"),
      input_switch(
        "Color by Rank", id = "settings.color_by_order",
        note = paste(
          "Switch from coloring by value to coloring by sorted index.",
          "This may help differentiate regions with similar values."
        )
      ),
      input_switch("Hide URL Settings", id = "settings.hide_url_parameters"),
      input_switch("Hide Tooltips", id = "settings.hide_tooltips"),
      input_switch("Show Missing Years", id = "settings.show_empty_times"),
      input_number("Digits", "settings.digits", default = 2, min = 0, max = 6, floating_label = FALSE),
      input_select(
        "Color Scale Center", options = c("none", "median", "mean"), default = "none",
        display = c("None", "Median", "Mean"), id = "settings.color_scale_center",
        floating_label = FALSE,
        note = "Determines whether and on what the color scale should be centered."
      ),
      input_select(
        "Summary Level", options = c("dataset", "children", "all"), default = "dataset",
        display = c("All Regions", "Selected Super-Region", "Showing Regions"), id = "settings.summary_selection",
        floating_label = FALSE,
        note = paste(
          "Determines which regions are included in summaries for box-plots and color scaling;",
          "summaries for All-Regions disregard all selection and filtering,",
          "Selected Super-Region include sub-regions within a selected region regardless of additional filters,",
          "and Showing Regions respect all forms of filtering."
        )
      ),
      '<p class="section-heading">Map Options</p>',
      input_switch("Show Point Overlay", default_on = TRUE, id = "settings.map_overlay"),
      input_switch("Show Background Shapes", default_on = TRUE, id = "settings.background_shapes"),
      input_switch("Background Shapes On Top", default_on = TRUE, id = "settings.background_top"),
      input_select(
        "Animations", c("fly", "zoom", "none"), "fly",
        note = "Fly animates the whole move to different regions; Zoom only animates changes in zoom level.",
        id = "settings.map_animations", floating_label = FALSE
      ),
      input_number(
        "Outline Weight", "settings.polygon_outline", default = 1.5, step = .5, floating_label = FALSE,
        note = "Thickness of the outline around region shapes."
      ),
      input_number(
        "Background Outline Weight", "settings.background_polygon_outline", default = 2,
        step = .5, floating_label = FALSE
      ),
      input_number(
        "Overlay Circle Size", "settings.circle_radius", default = 5, step = 1, floating_label = FALSE,
        note = "Radius of the circles that are parts of overlays."
      ),
      input_select(
        "Overlay Circle Property", "overlay_properties", id = "settings.circle_property", floating_label = FALSE,
        note = "Property to adjust circle size by."
      ),
      '<p class="section-heading">Plot Options</p>',
      input_select("Plot Type", c("scatter", "scattergl", "bar"), "scatter", id = "plot_type", floating_label = FALSE),
      input_switch("Box Plots", default_on = TRUE, id = "settings.boxplots"),
      input_switch(
        "Use IQR Whiskers", id = "settings.iqr_box",
        note = "Define the extreme fences of the box plots by 1.5 * interquartile range (true) or min and max (false)."
      ),
      input_number(
        "Trace Limit", "settings.trace_limit", default = 20, floating_label = FALSE,
        note = "Limit the number of plot traces that can be drawn, split between extremes of the variable."
      ),
      '<p class="section-heading">Table Options</p>',
      input_switch("Auto-Sort", default_on = TRUE, id = "settings.table_autosort"),
      input_switch("Auto-Scroll", default_on = TRUE, id = "settings.table_autoscroll"),
      input_select(
        "Scroll Behavior", c("instant", "smooth", "auto"), "auto",
        id = "settings.table_scroll_behavior", floating_label = FALSE
      )
    ),
    foot = list(
      input_button("Clear Settings", "reset_storage", "clear_storage", class = "btn-danger")
    )
  ),
  list(
    name = "About",
    items = list(
      page_text(c(
        paste0(
          "This site was made by the [Social and Decision Analytics Division]",
          "(https://biocomplexity.virginia.edu/institute/divisions/social-and-decision-analytics)",
          " of the [Biocomplexity Institute](https://biocomplexity.virginia.edu)."
        ),
        "View its source on [GitHub](https://github.com/uva-bi-sdad/capital_region).",
        input_button("Download Loaded Data", "export", query = list(
          features = list(geoid = "id", name = "name")
        ), class = "btn-full"),
        page_tutorials(
          button = "View Tutorials",
          class = "btn-full",
          fairfax_uc_loc = list(
            title = "Fairfax Urgent Care Locations",
            description = "View the locations of urgent care providers in Fairfax and Arlington county.",
            reset = TRUE,
            steps = list(
              list(
                description = "Select the urgent care availability (count) variable.",
                focus = "selected_variable",
                before = c("settings.polygon_outline" = 2, "settings.background_polygon_outline" = 3),
                after = "value:urgent_cnt"
              ),
              list(
                description = "Select tract as the starting layer.",
                focus = "shape_type",
                after = "value:tract"
              ),
              list(
                description = "Open the filter menu.",
                focus = "nav:Filter",
                after = "click"
              ),
              list(
                description = "Filter to Fairfax and Arlington county.",
                focus = "filter.county",
                option = c("51013", "51059"),
                after = c("set", "close"),
                wait = 600
              ),
              list(
                description = "Open the export menu to download.",
                focus = "#export_button",
                after = "click"
              )
            )
          ),
          fairfax_uc_drive = list(
            title = "Fairfax Urgent Care Drive Times",
            description = "View the drive time to urgent care providers in Fairfax and Arlington county.",
            reset = TRUE,
            steps = list(
              list(
                description = "Select the urgent care availability (drive time) variable.",
                focus = "selected_variable",
                before = c(
                  "settings.polygon_outline" = 2,
                  "settings.background_polygon_outline" = 3,
                  "settings.summary_selection" = "children"
                ),
                after = "value:urgent_near_10_median"
              ),
              list(
                description = "Select tract as the starting layer.",
                focus = "shape_type",
                after = "value:tract"
              ),
              list(
                description = "Open the filter menu.",
                focus = "nav:Filter",
                after = "click"
              ),
              list(
                description = "Filter to Fairfax and Arlington county.",
                focus = "filter.county",
                option = c("51013", "51059"),
                after = c("set", "close"),
                wait = 600
              ),
              list(
                description = "Open the export menu to download.",
                focus = "#export_button",
                after = "click"
              )
            )
          ),
          fairfax_uc_access = list(
            title = "Fairfax Urgent Care Access",
            description = "View a measure of access to urgent care providers in Fairfax and Arlington county.",
            reset = TRUE,
            steps = list(
              list(
                description = "Select the urgent care geographic availability variable.",
                focus = "selected_variable",
                before = c(
                  "settings.polygon_outline" = 2,
                  "settings.background_polygon_outline" = 3,
                  "settings.summary_selection" = "children",
                  "settings.color_by_order" = "on"
                ),
                after = "value:urgent_3sfca",
                time = 6
              ),
              list(
                description = "Select tract as the starting layer.",
                focus = "shape_type",
                after = "value:tract",
                time = 5
              ),
              list(
                description = "Open the filter menu.",
                focus = "nav:Filter",
                after = "click",
                time = 3
              ),
              list(
                description = "Filter to Fairfax and Arlington county.",
                focus = "filter.county",
                option = c("51013", "51059"),
                after = "set",
                time = 4,
                wait = 600
              ),
              list(
                description = "Add a filter on median household income.",
                focus = "filter_variable_dropdown",
                after = "value:median_household_income",
                time = 4
              ),
              list(
                description = "Change the operator to less than or equal to.",
                focus = ".filter-body tr:last-of-type .form-select.filter-form-input",
                after = "value:<=",
                time = 3
              ),
              list(
                description = "Set value to the first quantile.",
                focus = ".filter-body tr:last-of-type td:nth-child(6) .filter-form-input",
                after = c("value:Q1", "close"),
                time = 3
              ),
              list(
                description = "Open the export menu to download.",
                focus = "#export_button",
                after = "click",
                time = 4
              )
            )
          )
        )
      )),
      page_text(c(
        "Credits",
        paste(
          "Built in [R](https://www.r-project.org) with the",
          "[community](https://uva-bi-sdad.github.io/community) package, using these resources:"
        )
      ), class = c("h5", "")),
      output_credits()
    )
  )
)
page_menu(
  input_select("Starting Layer", c(
    "county", "tract", "block_group", "civic_association", "supervisor_district",
    "planning_district", "human_services_region", "zip_code"
  ), 0, id = "shape_type"),
  page_section(
    type = "row form-row",
    wraps = "row",
    input_combobox(
      "Counties", options = "ids", dataset = "county", dataview = "primary_view",
      id = "selected_county", clearable = TRUE
    ),
    input_combobox(
      "Census Tracts", options = "ids", dataset = "tract", dataview = "primary_view",
      id = "selected_tract", selection_subset = "tract_subset", clearable = TRUE
    ),
    conditions = c("lock: !selected_tract", "shapes == tract || shapes == block_group")
  ),
  input_combobox(
    "Variable", options = "variables", group_feature = "category",
    default = "no_hlth_ins_pct", depends = "shapes", id = "selected_variable"
  ),
  wraps = c("col-2", "col", "col"),
  position = "top",
  default_open = TRUE,
  conditions = c("lock: !selected_tract", "", "")
)
input_variable("shapes", list(
  "selected_county && shape_type == county" = "tract",
  "selected_tract" = "block_group"
), "shape_type", list(
  county = "Counties",
  tract = "Census Tracts",
  block_group = "Block Groups",
  civic_association = "Civic Associations",
  supervisor_district = "Supervisor Districts",
  planning_district = "Planning Districts",
  human_services_region = "Human Services Regions",
  zip_code = "Zip Codes"
))
input_variable("region_select", list(
  "shapes == county" = "selected_county"
), "selected_tract")
input_variable("selected_region", list(
  "selected_tract" = "selected_tract"
), "selected_county")
input_variable("set_palette", list(
  "color_by_setting == rank" = "lajolla",
  "color_by_setting == quintile" = "greens5"
), "vik")
input_variable("tract_subset", list(
  "selected_county" = "siblings"
), "full_filter")
input_rule("color_by_setting == value", list(settings.color_by_order = FALSE))
input_rule("color_by_setting != value", list(settings.color_by_order = TRUE))
input_rule("!settings.color_by_order", list(color_by_setting = "value"))
input_rule("settings.color_by_order && color_by_setting == value", list(color_by_setting = "rank"))
input_dataview(
  "primary_view",
  y = "selected_variable",
  x = "selected_year",
  dataset = "shapes",
  ids = "selected_region",
  time = "time",
  time_agg = "selected_year",
  palette = "set_palette"
)
page_section(
  type = "col",
  output_text(c(
    "(National Capital Region)[r selected_county,selected_tract]",
    "? > {selected_county}[r selected_tract]",
    "? > {selected_tract}"
  ), class = "compact"),
  output_text(list(
    "default" = "National Capital Region {shapes}",
    "selected_region" = "{selected_region} {shapes}"
  ), tag = "h1", class = "text-center"),
  page_section(
    type = "container-xsm",
    input_number(
      "Selected Year", min = "filter.time_min", max = "filter.time_max", default = "max",
      id = "selected_year", buttons = TRUE, show_range = TRUE, note = paste(
        "Year of the selected variable to color the map shapes and plot elements by, and to show on hover."
      )
    )
  ),
  page_section(
    type = "row",
    wraps = "col",
    sizes = c(NA, 5),
    output_map(
      unlist(lapply(list(
        c("human_services_region", "human_services_regions", "VA/Local%20Geographies/Fairfax%20County/Human%20Services%20Regions/2022"),
        c("planning_district", "planning_districts", "VA/Local%20Geographies/Fairfax%20County/Planning%20Districts/2022"),
        c("supervisor_district", "supervisor_districts", "VA/Local%20Geographies/Fairfax%20County/Supervisor%20Districts/2022"),
        c("zip_code", "zip_codes", "VA/Local%20Geographies/Fairfax%20County/Zip%20Codes/2022"),
        c("civic_association", "civic_associations", "VA/Local%20Geographies/Arlington%20County/Civic%20Associations/2021"),
        c("block_group", "census_block_groups", "NCR/Census%20Geographies/Block%20Group"),
        c("tract", "census_tracts", "NCR/Census%20Geographies/Tract"),
        c("county", "counties", "NCR/Census%20Geographies/County")
      ), function(s) {
        noncensus <- s[2] %in% c(
          "civic_associations", "human_services_regions", "planning_districts", "supervisor_districts", "zip_codes"
        )
        pref <- if (s[1] == "civic_association")
          "va013_geo_arl_2021_" else if (noncensus) "va059_geo_ffxct_gis_2022_" else "ncr_geo_census_cb_"
        if (noncensus) { 
          list(list(
            name = s[1],
            url = paste0(
              "https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/",
              s[3], "/data/distribution/", pref, s[2], ".geojson"
            )
          ))
        } else {
          list(
            list(
              name = s[1],
              time = 2010,
              url = paste0(
                "https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/",
                s[3], "/2010/data/distribution/", pref, "2010_", s[2], ".geojson"
              )
            ),
            list(
              name = s[1],
              time = 2020,
              url = paste0(
                "https://raw.githubusercontent.com/uva-bi-sdad/sdc.geographies/main/",
                s[3], "/2020/data/distribution/", pref, "2020_", s[2], ".geojson"
              )
            )
          )
        }
      }), recursive = FALSE),
      dataview = "primary_view",
      click = "region_select",
      id = "main_map",
      subto = c("main_plot", "rank_table", "main_legend"),
      options = list(
        attributionControl = FALSE,
        scrollWheelZoom = FALSE,
        center = c(38.9936, -77.3135),
        zoom = 8,
        height = "430px",
        zoomAnimation = "settings.map_zoom_animation"
      ),
      background_shapes = "county",
      tiles = list(
        light = list(url = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"),
        dark = list(url = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png")
      ),
      attribution = list(
        list(
          name = "Stamen toner-light",
          url = "https://stamen.com",
          description = "Light-theme map tiles by Stamen Design"
        ),
        list(
          name = "CARTO Dark Matter",
          url = "https://carto.com/attributions",
          description = "Dark-theme map tiles by CARTO"
        ),
        list(
          name = "OpenStreetMap",
          url = "https://www.openstreetmap.org/copyright"
        )
      )
    ),
    page_section(
      type = "flex-column col",
      output_info(
        title = "variables.short_name",
        dataview = "primary_view",
        id = "variable_info_pane",
      ),
      page_popup(
        "Export", id = "export_button",
        page_section(
          wraps = "col",
          input_select("Table Format", c("tall", "mixed", "wide"), "mixed", id = "export_table_format"),
          input_select("File Format", c("csv", "tsv"), "csv", c("CSV", "TSV"), id = "export_file_format")
        ),
        input_button(
          "Download", "export", dataview = "primary_view", query = list(
            include = "selected_variable",
            features = list(geoid = "id", name = "name"),
            table_format = "export_table_format", file_format = "export_file_format"
          ), class = "btn-full"
        ),
        input_button(
          "Copy API link", "copy", dataview = "primary_view", query = list(
            include = "selected_variable", dataset = "shapes",
            features = list(geoid = "id", name = "name"),
            table_format = "export_table_format", file_format = "export_file_format"
          ), class = "btn-full"
        )
      ),
      output_info(body = "summary", dataview = "primary_view"),
      output_info("Filters", "filter", dataview = "primary_view"),
      page_section(
        output_info(
          title = "features.name",
          default = c(title = "National Capital Region", body = "Hover over or select a region for more information."),
          dataview = "primary_view",
          subto = c("main_map", "main_plot", "rank_table", "main_legend")
        ),
        output_info(
          body = c(
            "variables.long_name" = "selected_variable",
            "variables.statement"
          ),
          row_style = c("stack", "table"),
          dataview = "primary_view",
          subto = c("main_map", "main_plot", "rank_table", "main_legend"),
          variable_info = FALSE
        )
      )
    )
  ),
  page_section(
    type = "row",
    wraps = "col",
    sizes = c(5, 7),
    page_section(
      page_section(
        wraps = "col-md",
        sizes = c(NA, 1),
        output_legend(
          "settings.palette", dataview = "primary_view", click = "region_select",
          subto = c("main_map", "main_plot", "rank_table"), id = "main_legend"
        ),
        input_checkbox(
          "Color By", c("value", "rank", "quintile"), 0,
          id = "color_by_setting", multi = FALSE, class = "compact"
        )
      ),
      output_table("selected_variable", dataview = "primary_view", options = list(
        info = FALSE,
        searching = FALSE,
        scrollY = 300,
        dom = "<'row't>"
      ), id = "rank_table", click = "region_select", subto = c("main_map", "main_plot", "main_legend"))
    ),
    output_plot(
      x = "time", y = "selected_variable", dataview = "primary_view",
      click = "region_select", subto = c("main_map", "rank_table", "main_legend"), id = "main_plot",
      options = list(
        layout = list(
          xaxis = list(title = FALSE, fixedrange = TRUE),
          yaxis = list(fixedrange = TRUE, zeroline = FALSE)
        ),
        data = data.frame(
          type = c("plot_type", "box"), fillcolor = c(NA, "transparent"),
          hoverinfo = c("text", NA), mode = "lines+markers", showlegend = FALSE,
          name = c(NA, "Summary"), marker.line.color = "#767676", marker.line.width = 1
        ),
        config = list(modeBarButtonsToRemove = c("select2d", "lasso2d", "sendDataToCloud"))
      )
    )
  )
)
