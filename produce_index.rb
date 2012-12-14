require 'rubygems'
require 'haml'
require 'json'

data = JSON.parse(File.read('dq10skill-data.json'))

#skillCategories = data['skillCategories']
#data['vocationOrder'].each do |vocation|
#  puts vocation
#  puts data['vocations'][vocation]['skills'].join
#end
puts Haml::Engine.new(File.read('index.haml')).render(Object.new, :data => data)
