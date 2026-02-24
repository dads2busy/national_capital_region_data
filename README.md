# National Capital Region Data

This site was generated from the [Social Data Commons](https://github.com/uva-bi-sdad/social_data_commons)'s
[capital_region](https://github.com/uva-bi-sdad/social_data_commons/blob/main/views/capital_region/view.json) view.


To recompile from source repositories, clone that repository, and run this (assuming this repository is in the same directory):

```R
# remotes::install_github("uva-bi-sdad/community")
library(community)

# clone/pull the data repositories
datacommons_refresh("../social_data_commons")

# rebuild the view
datacommons_view(
  "../social_data_commons", "capital_region",
  formatters = list(region_name = function(x) sub(",.*$", "", x))
)
```

To run the site locally, run this:

```R
site_build(
  "../capital_region", version = "dev", serve = TRUE,
  endpoint = "https://ncr-data-commons.netlify.app/api"
)
```
