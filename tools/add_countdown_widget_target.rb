require 'xcodeproj'

project_path = 'ios/App/App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Define the target name
target_name = 'CountdownWidget'

# Check if target already exists
if project.targets.find { |t| t.name == target_name }
  puts "Target '#{target_name}' already exists. Skipping..."
else
  # 1. Create the App Extension target
  widget_target = project.new_target(:app_extension, target_name, :ios, '14.0')
  widget_target.product_type = 'com.apple.product-type.app-extension'

  # 2. Create the folder structure in the project if it doesn't exist
  widget_group = project.main_group.find_subpath(target_name, true)
  widget_group.set_path(target_name)
  widget_group.set_source_tree('<group>')

  # 3. Add files to the group and target
  files = [
    'Info.plist',
    'CountdownWidget.swift'
  ]

  files.each do |file_name|
    file_ref = widget_group.new_file(file_name)
    widget_target.add_file_references([file_ref])
  end

  # 4. Set Build Settings
  widget_target.build_configurations.each do |config|
    config.build_settings['INFOPLIST_FILE'] = "#{target_name}/Info.plist"
    config.build_settings['LD_RUNPATH_SEARCH_PATHS'] = '$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks'
    config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = "com.countdown.app.#{target_name}"
    config.build_settings['SKIP_INSTALL'] = 'YES'
    config.build_settings['SWIFT_VERSION'] = '5.0'
    config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2' # iPhone, iPad
  end

  # 5. Add the target to the main app's dependencies
  app_target = project.targets.find { |t| t.name == 'App' }
  if app_target
    puts "Adding #{target_name} dependency to App target"
    
    # Add as a dependency
    app_target.add_dependency(widget_target)
    
    # Add to Embed App Extensions build phase
    embed_extensions_phase = app_target.copy_files_build_phases.find { |p| p.name == 'Embed App Extensions' } || 
                             app_target.new_copy_files_build_phase('Embed App Extensions')
    embed_extensions_phase.dst_subfolder_spec = '13' # 13 is the value for "Plug-ins"
    embed_extensions_phase.add_file_reference(widget_target.product_reference)
  end

  project.save
  puts "Successfully added #{target_name} target to #{project_path}"
end
