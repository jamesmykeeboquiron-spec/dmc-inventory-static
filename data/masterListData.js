window.DMC_DATA = window.DMC_DATA || {};
window.DMC_DATA.masterList = { items: [] };

async function loadMasterList() {
  const { data, error } = await supabase
    .from('master_list')
    .select(`
      id,
      item_id,
      official_name,
      minimum_stock,
      active,
      notes,
      operating_areas ( name ),
      departments ( name ),
      sections ( name ),
      units ( name )
    `)
    .order('item_id');

  if (error) {
    console.error('Error loading master list:', error.message);
    return;
  }

  // Map Supabase data to the same shape the pages already expect
  window.DMC_DATA.masterList.items = data.map(item => ({
    operatingArea: item.operating_areas?.name || '',
    department:    item.departments?.name    || '',
    section:       item.sections?.name       || '',
    itemId:        item.item_id,
    officialItemName: item.official_name,
    unit:          item.units?.name          || '',
    minimumStock:  item.minimum_stock        || '',
    active:        item.active,
    notes:         item.notes                || ''
  }));

  console.log('Master list loaded from Supabase:', window.DMC_DATA.masterList.items.length, 'items');
}

loadMasterList();
